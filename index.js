const axios = require("axios");
require("dotenv").config();
// Blizzard API Credentials
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REALM_ID = 1329; // Example: Ravencrest (EU)
const REGION = "eu"; // Change to "us", "kr", etc.

// ✅ Define the items to track (Example: [Item ID: 942, Level: 65])
const TRACKED_ITEMS = [
    { id: 1168, level: 65 }, // Modify this list as needed
    { id: 942, level: 65 } // Example: Another tracked item (without level filter)
];

let lastPostedAuctions = new Map();

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

// Step 2: Fetch Auction Data from Battle.net API
async function getAuctionData() {
    try {
        const token = await getAccessToken();
        const response = await axios.get(
            `https://${REGION}.api.blizzard.com/data/wow/connected-realm/${REALM_ID}/auctions`,
            {
                headers: { Authorization: `Bearer ${token}` },
                params: { namespace: `dynamic-${REGION}`, locale: "en_US" },
            }
        );

        const auctionData = response.data.auctions;

        // Step 3: Filter Auctions to Only Include Tracked Items
        let filteredAuctions = auctionData
            .filter(item => 
                item.quantity > 0 && 
                TRACKED_ITEMS.some(tracked => tracked.id === item.item.id) // Check if item is in the list
            )
            .map(item => ({
                id: item.item.id,
                price: item.unit_price ? item.unit_price / 10000 : item.buyout ? item.buyout / 10000 : "N/A",
                quantity: item.quantity,
                server: "Ravencrest",
                region: REGION.toUpperCase(),
                time_left: item.time_left
            }));

        // Step 4: Sort by `time_left` first, then price
        filteredAuctions.sort((a, b) => {
            const timeDiff = TIME_PRIORITY[a.time_left] - TIME_PRIORITY[b.time_left];
            return timeDiff !== 0 ? timeDiff : b.price - a.price; // Sort by price if `time_left` is the same
        });

        // Step 5: Get Only the 5 Most Recent Auctions
        const latestAuctions = filteredAuctions.slice(0, 5);

        // Step 6: Prevent Duplicates & Log New Items
        for (const auction of latestAuctions) {
            const key = `${auction.id}-${auction.price}-${auction.server}`;

            if (!lastPostedAuctions.has(key) || lastPostedAuctions.get(key).price !== auction.price) {
                lastPostedAuctions.set(key, auction);
                console.log(`✅ Tracked Auction Found!`);
                console.log(`Item ID: ${auction.id}`);
                console.log(`Server: ${auction.server} - ${auction.region}`);
                console.log(`Price: ${auction.price} G`);
                console.log(`Quantity: ${auction.quantity}`);
                console.log(`Time Left: ${auction.time_left}`);
                console.log(`--------------------------`);
            }
        }

    } catch (error) {
        console.error("Error fetching auction data:", error.response?.data || error.message);
    }
}

// Fetch once & exit
// setInterval(getAuctionData, 5 * 60 * 1000);
// getAuctionData()
getAuctionData().then(() => process.exit(0));
