const axios = require("axios");
require("dotenv").config();
// const cron = require("node-cron");

const CLIENT_ID = process.env.CLIENT_ID;  // Replace with actual Client ID
const CLIENT_SECRET = process.env.CLIENT_SECRET;  // Replace with actual Client Secret
const TOKEN_URL = "https://oauth.battle.net/token";
const REALM_ID = 1329;  // Replace with actual Realm ID
const API_URL = `https://eu.api.blizzard.com/data/wow/connected-realm/${REALM_ID}/auctions?namespace=dynamic-eu`;

const ITEM_IDS = [1168, 942]; // Items to filter

// Function to get access token
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

// Function to fetch auction data
async function fetchAuctionData() {
    try {
        const token = await getAccessToken();
        if (!token) return;
        
        const response = await axios.get(API_URL, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const filteredAuctions = response.data.auctions.filter(auction => ITEM_IDS.includes(auction.item.id));
        
        let itemData = {};
        
        ITEM_IDS.forEach(itemId => {
            const itemAuctions = filteredAuctions.filter(a => a.item.id === itemId);
            if (itemAuctions.length > 0) {
                const firstAuction = itemAuctions[0];
                const recentAuction = itemAuctions[itemAuctions.length - 1];
                
                itemData[itemId] = {
                    first: {
                        id: firstAuction.id,
                        server: REALM_ID,
                        region: "Ravencrest - EU",
                        item_id: firstAuction.item.id,
                        price: firstAuction.buyout ? firstAuction.buyout / 10000 : null,
                        quantity: firstAuction.quantity,
                        time_left: firstAuction.time_left
                    },
                    recent: {
                        id: recentAuction.id,
                        server: REALM_ID,
                        region: "Ravencrest - EU",
                        item_id: recentAuction.item.id,
                        price: recentAuction.buyout ? recentAuction.buyout / 10000 : null,
                        quantity: recentAuction.quantity,
                        time_left: recentAuction.time_left
                    }
                };
            }
        });
        
        console.log("Filtered Auction Data Fetched at:", new Date().toLocaleString());
        Object.values(itemData).forEach(item => {
            console.log("Current Auction:", item.first);
            console.log("Recent Auction:", item.recent);
        });
    } catch (error) {
        console.error("Error fetching auction data:", error.message);
    }
}

// // Schedule task to run every hour
// cron.schedule("0 * * * *", fetchAuctionData);

// Initial fetch on startup
fetchAuctionData();