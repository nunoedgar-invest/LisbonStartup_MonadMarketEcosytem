// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title StartupMarket – Hackathon MVP
/// @notice Create startups, buy/sell conviction tokens, vote on milestones, view leaderboard

contract StartupMarket {

    // ─────────────────────────────────────────────
    //  STRUCTS
    // ─────────────────────────────────────────────

    struct Startup {
        uint256 id;
        string  name;
        string  description;
        address founder;
        uint256 tokenSupply;   // total conviction tokens minted
        uint256 ethBalance;    // ETH held in bonding curve
        bool    exists;
    }

    struct Milestone {
        uint256 id;
        uint256 startupId;
        string  description;
        uint256 votesFor;
        uint256 votesAgainst;
        bool    resolved;
        bool    passed;
    }

    // ─────────────────────────────────────────────
    //  STATE
    // ─────────────────────────────────────────────

    uint256 public startupCount;
    uint256 public milestoneCount;

    /// startupId → Startup
    mapping(uint256 => Startup) public startups;

    /// startupId → holder → token balance
    mapping(uint256 => mapping(address => uint256)) public convictionBalance;

    /// milestoneId → Milestone
    mapping(uint256 => Milestone) public milestones;

    /// milestoneId → voter → hasVoted
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    /// ordered list of startup IDs for leaderboard iteration
    uint256[] public startupIds;

    // ─────────────────────────────────────────────
    //  EVENTS
    // ─────────────────────────────────────────────

    event StartupCreated(uint256 indexed id, string name, address indexed founder);
    event TokensBought(uint256 indexed startupId, address indexed buyer, uint256 amount, uint256 ethPaid);
    event TokensSold(uint256 indexed startupId, address indexed seller, uint256 amount, uint256 ethReturned);
    event MilestoneCreated(uint256 indexed milestoneId, uint256 indexed startupId, string description);
    event VoteCast(uint256 indexed milestoneId, address indexed voter, bool support, uint256 weight);
    event MilestoneResolved(uint256 indexed milestoneId, bool passed);

    // ─────────────────────────────────────────────
    //  BONDING CURVE HELPERS
    //  Price (wei per token) = BASE_PRICE + SLOPE × supply
    // ─────────────────────────────────────────────

    uint256 public constant BASE_PRICE = 0.0001 ether;   // 1e14 wei
    uint256 public constant SLOPE      = 0.00001 ether;  // 1e13 wei per token

    /// Cost to buy `amount` tokens when current supply is `supply`
    function buyPrice(uint256 supply, uint256 amount) public pure returns (uint256 total) {
        // sum of arithmetic series: Σ(BASE + SLOPE*(supply+i)) for i=0..amount-1
        // = amount*BASE + SLOPE * (amount*supply + amount*(amount-1)/2)
        total = amount * BASE_PRICE + SLOPE * (amount * supply + (amount * (amount - 1)) / 2);
    }

    /// ETH returned for selling `amount` tokens when current supply is `supply`
    function sellReturn(uint256 supply, uint256 amount) public pure returns (uint256 total) {
        require(amount <= supply, "Insufficient supply");
        // series from (supply-amount) to (supply-1)
        uint256 newSupply = supply - amount;
        total = amount * BASE_PRICE + SLOPE * (amount * newSupply + (amount * (amount - 1)) / 2);
    }

    // ─────────────────────────────────────────────
    //  1. CREATE STARTUP
    // ─────────────────────────────────────────────

    function createStartup(string calldata name, string calldata description)
        external
        returns (uint256 id)
    {
        require(bytes(name).length > 0, "Name required");

        id = ++startupCount;
        startups[id] = Startup({
            id:          id,
            name:        name,
            description: description,
            founder:     msg.sender,
            tokenSupply: 0,
            ethBalance:  0,
            exists:      true
        });
        startupIds.push(id);

        emit StartupCreated(id, name, msg.sender);
    }

    // ─────────────────────────────────────────────
    //  2. BUY CONVICTION TOKENS
    // ─────────────────────────────────────────────

    function buyTokens(uint256 startupId, uint256 amount) external payable {
        require(startups[startupId].exists, "Startup not found");
        require(amount > 0, "Amount must be > 0");

        Startup storage s = startups[startupId];
        uint256 cost = buyPrice(s.tokenSupply, amount);
        require(msg.value >= cost, "Insufficient ETH");

        s.tokenSupply += amount;
        s.ethBalance  += cost;
        convictionBalance[startupId][msg.sender] += amount;

        // refund excess ETH
        if (msg.value > cost) {
            payable(msg.sender).transfer(msg.value - cost);
        }

        emit TokensBought(startupId, msg.sender, amount, cost);
    }

    // ─────────────────────────────────────────────
    //  3. SELL CONVICTION TOKENS
    // ─────────────────────────────────────────────

    function sellTokens(uint256 startupId, uint256 amount) external {
        require(startups[startupId].exists, "Startup not found");
        require(amount > 0, "Amount must be > 0");

        Startup storage s = startups[startupId];
        require(convictionBalance[startupId][msg.sender] >= amount, "Insufficient tokens");

        uint256 refund = sellReturn(s.tokenSupply, amount);
        require(s.ethBalance >= refund, "Curve balance error");

        s.tokenSupply -= amount;
        s.ethBalance  -= refund;
        convictionBalance[startupId][msg.sender] -= amount;

        payable(msg.sender).transfer(refund);

        emit TokensSold(startupId, msg.sender, amount, refund);
    }

    // ─────────────────────────────────────────────
    //  4. LEADERBOARD  (off-chain sort via view)
    // ─────────────────────────────────────────────

    /// Returns all startups ordered by tokenSupply descending (bubble sort – fine for MVP)
    function getLeaderboard()
        external
        view
        returns (Startup[] memory sorted)
    {
        uint256 len = startupIds.length;
        sorted = new Startup[](len);

        for (uint256 i = 0; i < len; i++) {
            sorted[i] = startups[startupIds[i]];
        }

        // bubble sort descending by tokenSupply
        for (uint256 i = 0; i < len; i++) {
            for (uint256 j = i + 1; j < len; j++) {
                if (sorted[j].tokenSupply > sorted[i].tokenSupply) {
                    Startup memory tmp = sorted[i];
                    sorted[i] = sorted[j];
                    sorted[j] = tmp;
                }
            }
        }
    }

    // ─────────────────────────────────────────────
    //  5. VOTE ON MILESTONES
    // ─────────────────────────────────────────────

    /// Founder proposes a milestone for their startup
    function createMilestone(uint256 startupId, string calldata description)
        external
        returns (uint256 id)
    {
        Startup storage s = startups[startupId];
        require(s.exists, "Startup not found");
        require(s.founder == msg.sender, "Only founder");
        require(bytes(description).length > 0, "Description required");

        id = ++milestoneCount;
        milestones[id] = Milestone({
            id:           id,
            startupId:    startupId,
            description:  description,
            votesFor:     0,
            votesAgainst: 0,
            resolved:     false,
            passed:       false
        });

        emit MilestoneCreated(id, startupId, description);
    }

    /// Token holders vote; weight = their conviction token balance
    function vote(uint256 milestoneId, bool support) external {
        Milestone storage m = milestones[milestoneId];
        require(m.id != 0, "Milestone not found");
        require(!m.resolved, "Already resolved");
        require(!hasVoted[milestoneId][msg.sender], "Already voted");

        uint256 weight = convictionBalance[m.startupId][msg.sender];
        require(weight > 0, "No conviction tokens");

        hasVoted[milestoneId][msg.sender] = true;

        if (support) {
            m.votesFor += weight;
        } else {
            m.votesAgainst += weight;
        }

        emit VoteCast(milestoneId, msg.sender, support, weight);
    }

    /// Anyone can resolve once voting is complete (simple majority)
    function resolveMilestone(uint256 milestoneId) external {
        Milestone storage m = milestones[milestoneId];
        require(m.id != 0, "Milestone not found");
        require(!m.resolved, "Already resolved");

        m.resolved = true;
        m.passed   = m.votesFor > m.votesAgainst;

        emit MilestoneResolved(milestoneId, m.passed);
    }

    // ─────────────────────────────────────────────
    //  VIEWS
    // ─────────────────────────────────────────────

    function getStartup(uint256 id) external view returns (Startup memory) {
        return startups[id];
    }

    function getMilestone(uint256 id) external view returns (Milestone memory) {
        return milestones[id];
    }

    function getMyTokens(uint256 startupId) external view returns (uint256) {
        return convictionBalance[startupId][msg.sender];
    }

    function getBuyPrice(uint256 startupId, uint256 amount) external view returns (uint256) {
        return buyPrice(startups[startupId].tokenSupply, amount);
    }

    function getSellReturn(uint256 startupId, uint256 amount) external view returns (uint256) {
        return sellReturn(startups[startupId].tokenSupply, amount);
    }
}

