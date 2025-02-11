const axios = require("axios");
require("dotenv").config();

// Blizzard API Credentials
const CLIENT_ID = process.env.CLIENT_ID;;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REALM_ID = 1329; // Example: Ravencrest (EU)
const REGION = "eu"; // Change to "us", "kr", etc.
const MAX_RESULTS = 2; // Limit to the 5 most recent auctions

// Priority mapping for `time_left`
const TIME_PRIORITY = {
    "SHORT": 1,       // Most recent
    "MEDIUM": 2,
    "LONG": 3,
    "VERY_LONG": 4    // Oldest
};

// Step 1: Get OAuth Token
async function getAccessToken() {
    const response = await axios.post(
        `https://${REGION}.battle.net/oauth/token`,
        new URLSearchParams({ grant_type: "client_credentials" }),
        {
            auth: { username: CLIENT_ID, password: CLIENT_SECRET },
        }
    );
    return response.data.access_token;
}

// Step 2: Fetch All Realm IDs
async function getAllRealmIds(token) {
    try {
        const response = await axios.get(
            `https://${REGION}.api.blizzard.com/data/wow/connected-realm/index`,
            {
                headers: { Authorization: `Bearer ${token}` },
                params: { namespace: `dynamic-${REGION}`, locale: "en_US" },
            }
        );

        console.log("🔍 API Response for Realms:", JSON.stringify(response.data, null, 2));

        if (!response.data.connected_realms || response.data.connected_realms.length === 0) {
            console.error("⚠ No realms found in API response.");
            return [];
        }

        return response.data.connected_realms.map(realm => {
            const match = realm.href.match(/\/(\d+)$/);
            return match ? match[1] : null;  // Extract realm IDs safely
        }).filter(id => id !== null);  // Remove any null values

    } catch (error) {
        console.error("❌ Error fetching realm IDs:", error.response?.data || error.message);
        return [];
    }
}

// Step 3: Fetch Auctions for a Given Realm
async function getAuctionDataForRealm(token, realmId) {
    try {
        const response = await axios.get(
            `https://${REGION}.api.blizzard.com/data/wow/connected-realm/${REALM_ID}/auctions`,
            {
                headers: { Authorization: `Bearer ${token}` },
                params: { namespace: `dynamic-${REGION}`, locale: "en_US" },
            }
        );

        return response.data.auctions.map(item => ({
            id: item.item.id,
            price: item.unit_price ? item.unit_price / 10000 : item.buyout ? item.buyout / 10000 : "N/A",
            quantity: item.quantity,
            server: `Realm-${realmId}`,
            region: REGION.toUpperCase(),
            time_left: item.time_left || "UNKNOWN"  // Ensure time_left is never null
        }));
    } catch (error) {
        console.error(`Error fetching data for realm ${REALM_ID}:`, error.message);
        return [];
    }
}

// Step 4: Fetch All Auctions Across All Realms
async function getMostRecentAuctions() {
    try {
        const token = await getAccessToken();
        const realmIds = await getAllRealmIds(token);

        console.log(`🔍 Fetching auction data for ${realmIds.length} realms...`);

        let allAuctions = [];

        // Fetch auctions from all realms in parallel
        const auctionPromises = realmIds.map(realmId => getAuctionDataForRealm(token, realmId));
        const results = await Promise.all(auctionPromises);

        results.forEach(auctions => allAuctions.push(...auctions));

        // Step 5: Remove duplicates & sort by recency
        let uniqueAuctions = new Map();

        allAuctions.forEach(auction => {
            const key = `${auction.id}-${auction.price}-${auction.server}`;
            if (!uniqueAuctions.has(key)) {
                uniqueAuctions.set(key, auction);
            }
        });

        let sortedAuctions = Array.from(uniqueAuctions.values()).sort((a, b) => {
            const timeA = TIME_PRIORITY[a.time_left] || 99; // Default to 99 if null
            const timeB = TIME_PRIORITY[b.time_left] || 99;
            const timeDiff = timeA - timeB;
            return timeDiff !== 0 ? timeDiff : b.price - a.price; // If same time_left, sort by price
        });

        // Step 6: Get Only the 5 Most Recent Auctions
        const latestAuctions = sortedAuctions.slice(0, MAX_RESULTS);

        // Step 7: Log Results
        console.log(`✅ Showing ${latestAuctions.length} most recent auctions:`);
        latestAuctions.forEach(auction => {
            console.log(`Item ID: ${auction.id}`);
            console.log(`Server: ${auction.server} - ${auction.region}`);
            console.log(`Price: ${auction.price} G`);
            console.log(`Quantity: ${auction.quantity}`);
            console.log(`Time Left: ${auction.time_left}`);
            console.log(`--------------------------`);
        });

    } catch (error) {
        console.error("Error fetching auction data:", error.message);
    }
}

// Fetch once & exit
getMostRecentAuctions().then(() => process.exit(0));

