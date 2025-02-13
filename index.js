const axios = require("axios");
require("dotenv").config();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const TOKEN_URL = "https://oauth.battle.net/token";

// Define search configurations with specific levels
const SEARCH_CONFIGS = [
    {
        realm: "ravencrest",
        region: "eu",
        realmId: 1329,
        items: [
            { id: 942, targetLevel: 65 },
            { id: 1168, targetLevel: 65 }
        ]
    },
    {
        realm: "draenor",
        region: "eu",
        realmId: 1403,
        items: [
            { id: 31336, targetLevel: 65 },
            { id: 163573, targetLevel: 70 }
        ]
    }
];

function formatGold(copper) {
    return (copper / 10000).toFixed(2);
}

function generateUndermineURL(region, realm, itemId, targetLevel) {
    return `https://undermine.exchange/#${region}-${realm}/${itemId}-${targetLevel}`;
}

async function getAccessToken() {
    try {
        const response = await axios.post(TOKEN_URL, "grant_type=client_credentials", {
            auth: {
                username: CLIENT_ID,
                password: CLIENT_SECRET
            },
            headers: { "Content-Type": "application/x-www-form-urlencoded" }
        });
        return response.data.access_token;
    } catch (error) {
        console.error("Error getting access token:", error.message);
        return null;
    }
}

async function getItemDetails(itemId, region, token) {
    try {
        const response = await axios.get(
            `https://${region}.api.blizzard.com/data/wow/item/${itemId}?namespace=static-${region}`,
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );
        return response.data;
    } catch (error) {
        console.error(`Error fetching item details for item ${itemId}:`, error.message);
        return null;
    }
}

async function fetchAuctionDataForConfig(config) {
    try {
        const token = await getAccessToken();
        if (!token) return;

        const API_URL = `https://${config.region}.api.blizzard.com/data/wow/connected-realm/${config.realmId}/auctions?namespace=dynamic-${config.region}`;
        const response = await axios.get(API_URL, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log(`\nFetching data for ${config.realm.toUpperCase()} at ${new Date().toLocaleString()}`);

        for (const itemConfig of config.items) {
            // const undermineUrl = generateUndermineURL(
            //     config.region, 
            //     config.realm, 
            //     itemConfig.id, 
            //     itemConfig.targetLevel
            // );
            
            // console.log(`\nUndermine Exchange URL: ${undermineUrl}`);

            // Get item details
            const itemDetails = await getItemDetails(itemConfig.id, config.region, token);
            if (!itemDetails) continue;

            // Should be changed to filter by both ID and level:
            const itemAuctions = response.data.auctions.filter(auction => 
                auction.item.id === itemConfig.id 
            );

            console.log(`\nItem: ${itemDetails.name.en_US} (ID: ${itemConfig.id})`);
            console.log(`Searching for Level ${itemConfig.targetLevel} items`);

            if (itemAuctions.length > 0) {
                // Group auctions by price for better analysis
                const auctionsByPrice = new Map();
                itemAuctions.forEach(auction => {
                    if (auction.buyout) {
                        const price = auction.buyout;
                        if (!auctionsByPrice.has(price)) {
                            auctionsByPrice.set(price, []);
                        }
                        auctionsByPrice.get(price).push(auction);
                    }
                });

                if (auctionsByPrice.size > 0) {
                    console.log("\nCurrent Listings:");
                    let totalQuantity = 0;
                    
                    // Sort prices from lowest to highest
                    const sortedPrices = Array.from(auctionsByPrice.keys()).sort((a, b) => a - b);
                    
                    sortedPrices.forEach(price => {
                        const auctions = auctionsByPrice.get(price);
                        const quantity = auctions.reduce((sum, a) => sum + (a.quantity || 1), 0);
                        totalQuantity += quantity;
                        
                        console.log({
                            price: `${formatGold(price)} gold`,
                            quantity: quantity,
                            total_listings: auctions.length
                        });
                    });

                    // Calculate statistics
                    const minPrice = formatGold(sortedPrices[0]);
                    const maxPrice = formatGold(sortedPrices[sortedPrices.length - 1]);
                    const avgPrice = formatGold(
                        sortedPrices.reduce((sum, price) => sum + price, 0) / sortedPrices.length
                    );

                    console.log("\nSummary:");
                    console.log(`Total Quantity Available: ${totalQuantity}`);
                    console.log(`Lowest Price: ${minPrice} gold`);
                    console.log(`Highest Price: ${maxPrice} gold`);
                    console.log(`Average Price: ${avgPrice} gold`);
                } else {
                    console.log("No buyout prices found for this item");
                }
            } else {
                console.log("No auctions found");
            }
        }

    } catch (error) {
        console.error(`Error fetching auction data for ${config.realm}:`, error.message);
    }
}

async function fetchAllAuctionData() {
    for (const config of SEARCH_CONFIGS) {
        await fetchAuctionDataForConfig(config);
    }
}

// Initial fetch on startup
fetchAllAuctionData();