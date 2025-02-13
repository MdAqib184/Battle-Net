const axios = require("axios");
require("dotenv").config();
const cron =require("node-cron")

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const TOKEN_URL = "https://oauth.battle.net/token";

async function getAccessToken() {
    try {
        const response = await axios.post(TOKEN_URL, "grant_type=client_credentials", {
            auth: {
                username: CLIENT_ID,
                password: CLIENT_SECRET
            },
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        });
        return response.data.access_token;
    } catch (error) {
        console.error("Error getting access token:", error.message);
        return null;
    }
}

async function fetchAllAuctionData(realmId) {
    try {
        const token = await getAccessToken();
        if (!token) return null;

        const API_URL = `https://eu.api.blizzard.com/data/wow/connected-realm/${realmId}/auctions?namespace=dynamic-eu`;
        const response = await axios.get(API_URL, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        return response.data.auctions;
    } catch (error) {
        console.error(`Error fetching auction data:`, error.message);
        return null;
    }
}

async function getRealmId(realmName) {
    try {
        const token = await getAccessToken();
        if (!token) return null;

        const API_URL = `https://eu.api.blizzard.com/data/wow/search/connected-realm?namespace=dynamic-eu&realms.name.en_US=${realmName}`;
        const response = await axios.get(API_URL, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const realm = response.data.results.find(
            result => result.data.realms.some(
                realm => realm.name.en_US.toLowerCase() === realmName.toLowerCase()
            )
        );

        return realm ? realm.data.id : null;
    } catch (error) {
        console.error(`Error finding realm ID:`, error.message);
        return null;
    }
}

async function getItemId(itemName) {
    try {
        const token = await getAccessToken();
        if (!token) return null;

        const API_URL = `https://eu.api.blizzard.com/data/wow/search/item?namespace=static-eu&name.en_US=${itemName}`;
        const response = await axios.get(API_URL, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const item = response.data.results.find(
            result => result.data.name.en_US.toLowerCase() === itemName.toLowerCase()
        );

        return item ? item.data.id : null;
    } catch (error) {
        console.error(`Error finding item ID:`, error.message);
        return null;
    }
}

async function searchAuctions(itemName, realmName) {
    const realmId = await getRealmId(realmName);
    if (!realmId) {
        console.error(`Realm "${realmName}" not found`);
        return null;
    }

    const itemId = await getItemId(itemName);
    if (!itemId) {
        console.error(`Item "${itemName}" not found`);
        return null;
    }

    const allAuctions = await fetchAllAuctionData(realmId);
    if (!allAuctions) {
        console.error("Failed to fetch auction data");
        return null;
    }

    const filteredAuctions = allAuctions.filter(auction => auction.item.id === itemId);
    return {
        itemName,
        realmName,
        auctions: filteredAuctions
    };
}

async function batchSearchAuctions(searches) {
    const results = [];
    
    for (const search of searches) {
        console.log(`\nSearching for ${search.itemName}...`);
        
        for (const realm of search.realms) {
            console.log(`Checking ${realm}...`);
            const result = await searchAuctions(search.itemName, realm);
            console.log(result.auctions.length);
            
            if (result && result.auctions.length > 0) {
                console.log(`Found ${result.auctions.length} auctions in ${realm}:`);
                result.auctions.forEach(auction => {
                    console.log({
                        auction_id: auction.id,
                        price: auction.buyout ? auction.buyout / 10000 : null,
                        quantity: auction.quantity,
                        time_left: auction.time_left
                    });
                });
            } else {
                console.log(`No auctions found in ${realm}`);
            }
        }
    }
}

// Example usage for multiple realms and items:
const searchQueries = [
    {
        itemName: "Lightning Crown",
        realms: ["Tarren Mill"]
    },
    // {
    //     itemName: "Freezing Band",
    //     realms: ["Argent Dawn", "Ravencrest", "Draenor"]
    // }
];



cron.schedule("* * * * *", ()=>{batchSearchAuctions(searchQueries) });