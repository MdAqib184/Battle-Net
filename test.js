// const axios = require("axios");
// require("dotenv").config();

// const CLIENT_ID = process.env.CLIENT_ID;
// const CLIENT_SECRET = process.env.CLIENT_SECRET;
// const REALM_ID = 1329;
// const REGION = "eu";

// const TRACKED_ITEMS = [
//     { id: 1168, level: 65 },
//     { id: 942, level: 65 }
// ];

// let lastPostedAuctions = new Map();

// const TIME_PRIORITY = {
//     "SHORT": 1,
//     "MEDIUM": 2,
//     "LONG": 3,
//     "VERY_LONG": 4
// };

// async function getAccessToken() {
//     try {
//         const response = await axios.post(
//             `https://${REGION}.battle.net/oauth/token`,
//             new URLSearchParams({ grant_type: "client_credentials" }),
//             {
//                 auth: { username: CLIENT_ID, password: CLIENT_SECRET },
//             }
//         );
//         return response.data.access_token;
//     } catch (error) {
//         console.error("Error getting token:", error.message);
//         throw error;
//     }
// }

// async function getAuctionData() {
//     try {
//         const token = await getAccessToken();
//         const response = await axios.get(
//             `https://${REGION}.api.blizzard.com/data/wow/connected-realm/${REALM_ID}/auctions`,
//             {
//                 headers: { Authorization: `Bearer ${token}` },
//                 params: { namespace: `dynamic-${REGION}`, locale: "en_US" },
//             }
//         );

//         const auctionData = response.data.auctions;
        
//         // Log raw auction data structure
//         console.log("\n🔍 Sample auction data structure:");
//         if (auctionData.length > 0) {
//             console.log(JSON.stringify(auctionData[0], null, 2));
//         }

//         let filteredAuctions = auctionData
//             .filter(item => {
//                 // Log items that match IDs to see what's being filtered
//                 if (TRACKED_ITEMS.some(tracked => tracked.id === item.item.id)) {
//                     console.log("\nFound matching item:", item.item);
//                 }
//                 return item.quantity > 0 &&
//                        TRACKED_ITEMS.some(tracked => tracked.id === item.item.id);
//             })
//             .map(item => ({
//                 id: item.item.id,
//                 price: item.unit_price ? item.unit_price / 10000 : item.buyout ? item.buyout / 10000 : "N/A",
//                 quantity: item.quantity,
//                 server: "Ravencrest",
//                 region: REGION.toUpperCase(),
//                 time_left: item.time_left
//             }));

//         console.log("\n✅ Filtered Auctions:", filteredAuctions);

//         // Sort by time_left and price
//         filteredAuctions.sort((a, b) => {
//             const timeDiff = TIME_PRIORITY[a.time_left] - TIME_PRIORITY[b.time_left];
//             return timeDiff !== 0 ? timeDiff : b.price - a.price;
//         });

//         // Get latest auctions
//         const latestAuctions = filteredAuctions.slice(0, 5);

//         // Process and log auctions
//         for (const auction of latestAuctions) {
//             const key = `${auction.id}-${auction.price}-${auction.server}`;

//             if (!lastPostedAuctions.has(key) || lastPostedAuctions.get(key).price !== auction.price) {
//                 lastPostedAuctions.set(key, auction);
//                 console.log("\n🎯 Tracked Auction Found!");
//                 console.log(`Item ID: ${auction.id}`);
//                 console.log(`Server: ${auction.server} - ${auction.region}`);
//                 console.log(`Price: ${auction.price} G`);
//                 console.log(`Quantity: ${auction.quantity}`);
//                 console.log(`Time Left: ${auction.time_left}`);
//                 console.log("--------------------------");
//             }
//         }

//     } catch (error) {
//         console.error("Error:", error.response?.data || error.message);
//     }
// }

// // Run the function
// console.log("Starting auction check...");
// getAuctionData()
//     .then(() => process.exit(0));



const axios = require("axios");
require("dotenv").config();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REALM_ID = 1329;
const REGION = "eu";

const TRACKED_ITEMS = [
    { id: 1168, level: 65 },
    { id: 942, level: 65 }
];

async function getAccessToken() {
    try {
        const response = await axios.post(
            `https://${REGION}.battle.net/oauth/token`,
            new URLSearchParams({ grant_type: "client_credentials" }),
            {
                auth: { username: CLIENT_ID, password: CLIENT_SECRET },
            }
        );
        return response.data.access_token;
    } catch (error) {
        console.error("Error getting token:", error.message);
        throw error;
    }
}

async function getAuctionData() {
    try {
        const token = await getAccessToken();
        console.log("Fetching auction data...");

        const response = await axios.get(
            `https://${REGION}.api.blizzard.com/data/wow/connected-realm/${REALM_ID}/auctions`,
            {
                headers: { Authorization: `Bearer ${token}` },
                params: { namespace: `dynamic-${REGION}`, locale: "en_US" },
            }
        );

        const auctionData = response.data.auctions;
        console.log(`Total auctions found: ${auctionData.length}`);

        // Group auctions by item ID, keeping only the highest priced ones
        const latestAuctions = new Map();

        auctionData.forEach(auction => {
            const itemId = auction.item.id;
            if (TRACKED_ITEMS.some(tracked => tracked.id === itemId)) {
                const currentPrice = auction.unit_price ? auction.unit_price / 10000 : auction.buyout / 10000;
                const existingAuction = latestAuctions.get(itemId);

                // Update if:
                // 1. No existing auction for this item, or
                // 2. Current auction has a higher price (assuming higher price is more recent listing)
                if (!existingAuction || currentPrice > existingAuction.price) {
                    latestAuctions.set(itemId, {
                        id: itemId,
                        price: currentPrice,
                        quantity: auction.quantity,
                        server: "Ravencrest",
                        region: REGION.toUpperCase(),
                        time_left: auction.time_left
                    });
                }
            }
        });

        // Display the latest auctions
        for (const auction of latestAuctions.values()) {
            console.log("\n🎯 Tracked Auction Found!");
            console.log("------------------------");
            console.log(`Item ID: ${auction.id}`);
            console.log(`Server: ${auction.server} - ${auction.region}`);
            console.log(`Price: ${Math.floor(auction.price).toLocaleString()} G`);
            console.log(`Quantity: ${auction.quantity}`);
            console.log(`Time Left: ${auction.time_left}`);
            console.log("--------------------------");
        }

    } catch (error) {
        console.error("Error:", error.response?.data || error.message);
    }
}

// Run the function
console.log("Starting auction check...");
getAuctionData()
    .then(() => {
        console.log("Process completed");
        process.exit(0);
    });


