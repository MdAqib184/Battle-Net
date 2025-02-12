// const axios = require("axios");
// require("dotenv").config();

// const CLIENT_ID = process.env.CLIENT_ID;
// const CLIENT_SECRET = process.env.CLIENT_SECRET;
// const TOKEN_URL = "https://oauth.battle.net/token";

// const TARGET_ITEM = {
//     id: 1168,
//     targetLevel: 65,
//     realm: "ravencrest",
//     region: "eu",
//     realmId: 1329
// };

// async function getAccessToken() {
//     try {
//         const response = await axios.post(TOKEN_URL, "grant_type=client_credentials", {
//             auth: { username: CLIENT_ID, password: CLIENT_SECRET },
//             headers: { "Content-Type": "application/x-www-form-urlencoded" }
//         });
//         return response.data.access_token;
//     } catch (error) {
//         console.error("Error getting access token:", error.message);
//         return null;
//     }
// }

// async function getItemDetails(itemId, region, token) {
//     try {
//         const response = await axios.get(
//             `https://${region}.api.blizzard.com/data/wow/item/${itemId}?namespace=static-${region}`,
//             { headers: { Authorization: `Bearer ${token}` } }
//         );
//         return response.data;
//     } catch (error) {
//         console.error(`Error fetching item ${itemId}:`, error.message);
//         return null;
//     }
// }

// async function fetchAuctions() {
//     try {
//         const token = await getAccessToken();
//         if (!token) return;

//         // Fetch item static data
//         const itemDetails = await getItemDetails(TARGET_ITEM.id, TARGET_ITEM.region, token);
//         if (!itemDetails) return;

//         // Verify item level matches target
//         if (itemDetails.level !== TARGET_ITEM.targetLevel && 
//             itemDetails.required_level !== TARGET_ITEM.targetLevel) {
//             console.log(`Item level mismatch! Configured: ${TARGET_ITEM.targetLevel}, Actual: ${itemDetails.level}`);
//             return;
//         }

//         // Fetch auction data
//         const auctionsResponse = await axios.get(
//             `https://${TARGET_ITEM.region}.api.blizzard.com/data/wow/connected-realm/${TARGET_ITEM.realmId}/auctions?namespace=dynamic-${TARGET_ITEM.region}`,
//             { headers: { Authorization: `Bearer ${token}` } }
//         );

//         // Process auctions
//         const filteredAuctions = auctionsResponse.data.auctions.filter(auction => 
//             auction.item.id === TARGET_ITEM.id && 
//             auction.item.level === TARGET_ITEM.targetLevel
//         );

//         console.log(`\n${itemDetails.name.en_US} (Level ${TARGET_ITEM.targetLevel})`);
//         console.log(`Found ${filteredAuctions.length} auctions on ${TARGET_ITEM.realm}`);

//         if (filteredAuctions.length > 0) {
//             const prices = filteredAuctions.map(a => a.buyout ? a.buyout / 10000 : 0);
//             const minPrice = Math.min(...prices).toFixed(2);
//             const maxPrice = Math.max(...prices).toFixed(2);
//             const avgPrice = (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2);

//             console.log("\nPrice Analysis:");
//             console.log(`Lowest price: ${minPrice}g`);
//             console.log(`Highest price: ${maxPrice}g`);
//             console.log(`Average price: ${avgPrice}g`);

//             console.log("\nAll Listings:");
//             filteredAuctions.forEach(auction => {
//                 console.log(`- ${(auction.buyout / 10000).toFixed(2)}g | Quantity: ${auction.quantity || 1}`);
//             });
//         }
        
//         console.log(`\nUndermine Exchange URL: https://undermine.exchange/#${TARGET_ITEM.region}-${TARGET_ITEM.realm}/${TARGET_ITEM.id}-${TARGET_ITEM.targetLevel}`);

//     } catch (error) {
//         console.error("Error fetching data:", error.message);
//     }
// }

// // Run the fetch
// fetchAuctions();