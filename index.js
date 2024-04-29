require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api');

const axios = require("axios");

const adjustApiToken = process.env.ADJUST_API_TOKEN;

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {polling:true});

const adjustAPIEndpoint = process.env.ADJUST_API;
const mobiboxAPIEndpoint = process.env.MOBIBOX_API_ENDPOINT;
    

let name;
let storeId;

let appPlatform;
let channelSetup;
let requestBody;


let mobiboxNetworkId;
let mobiboxAppId;
let mobiboxAppPackageName;
let mobiboxAppPlatform

let authorized = false;


async function authenticateUser(chatId){
    try {
        // Make POST request to Adjust API
        const response = await axios.post(mobiboxAPIEndpoint + `?idapp=${mobiboxAppId}&idnetwork=${mobiboxNetworkId}`, {
            headers: {
                'Content-Type': 'application/json',
            }
        });
        // Example: Check response status and take appropriate action
        if (response.data.Authorized == "true") {
            authorized = true;
            await bot.sendMessage(chatId, response.data.Message);
        } else {
            await bot.sendMessage(chatId,  response.data.Message);
        }
    } catch (error) {
        await bot.sendMessage(chatId, error);
    }
}

// Function to add app to Adjust
async function addAppToAdjust(tiktokAppId, chatId) {
    requestBody = {
        name: name,
        bundle_id: storeId,
        store_id: storeId,
        platform: appPlatform,
        force_update: "true",
        channel_setup: {
            // facebook: {
            //     app_id: "123456789"
            // },
            tiktok: {
                app_id: tiktokAppId
            },
            tiktok_san: {
                app_id: tiktokAppId
            }
        }
    };

    try {
        // Make POST request to Adjust API
        const response = await axios.post(adjustAPIEndpoint, requestBody, {
            headers: {
                'Content-Type': 'application/json',
                'AdjustAuthorization': `Token ${adjustApiToken}`
            }
        });

        // Log response
        console.log(response.data);

        // Handle response accordingly
        // Example: Check response status and take appropriate action
        if (response.status === 200) {
            bot.sendMessage(chatId, 'Your Tiktok app Id has been added');
            console.log('App added successfully to Adjust.');
        } else {
            bot.sendMessage(chatId, 'Failed to add app to Adjust');
            console.error('Failed to add app to Adjust.');
        }
    } catch (error) {
        bot.sendMessage(chatId, 'Failed to add app to Adjust');
        console.error('Error occurred while adding app to Adjust:');
    }
}
// Function to add app to Adjust
async function getAppFromAdjust(bundleId, platform, chatId) {
    try {
        // Make POST request to Adjust API
        const response = await axios.get(adjustAPIEndpoint+`?store_id=${bundleId}&platform=${platform}`, {
            headers: {
                'Content-Type': 'application/json',
                'AdjustAuthorization': `Token ${adjustApiToken}`
            }
        });

        console.log(response.data);
        // Log response
    
        // Example: Check response status and take appropriate action
        if (response.status == 200) {
            console.log('App is retrieved successfully.');

            const data = response.data;

            name = data.name;
            bundleId = data.store_id;
            storeId = data.store_id;
            appPlatform = data.platform;
            channelSetup = data.channel_setup.tiktok.app_id;       

            
            await bot.sendMessage(chatId, 
                `Your app details are as following: 
                Name: ${name},
                Bundle Id: ${storeId},
                Platform: ${appPlatform}
                Tiktok App Ids: ${channelSetup}
            `);
            return true;
        } else {
            bot.sendMessage(chatId, response.data.detail);
            console.error('Failed to find app in Adjust Automation.');
            return false;

        }
    } catch (error) {
        bot.sendMessage(chatId, 'Failed to find app in Adjust Automation');
        console.error('Failed to find app in Adjust.');
        return false;
    }
}

// // Lambda handler function
module.exports.handler = async (event) => {
    try {      

        bot.onText(/\/start/, async msg => { 
            await bot.sendMessage(msg.chat.id, 'Welcome to the Mobibox Bot!\nHow can I assist you?\n\/login to authentciate your access.\n\/tiktok to add new Tiktok app id.');
         });
         
         bot.onText(/\/login/, async msg => { 
             const networkId = await bot.sendMessage(msg.chat.id, `Please provide your mobibox network id`, {
                 reply_markup: {
                     force_reply: true,
                 },
             });
             bot.onReplyToMessage(msg.chat.id, networkId.message_id, async (nameMsg) => {
                 mobiboxNetworkId = nameMsg.text;
         
                 // await bot.sendMessage(msg.chat.id, `Mobibox Network Id: ${networkId}!`);
         
         
                 const appId = await bot.sendMessage(msg.chat.id, `Please provide your mobibox app id`, {
                     reply_markup: {
                         force_reply: true,
                     },
                 });
         
                 bot.onReplyToMessage(msg.chat.id, appId.message_id, async (nameMsg) => {
                     mobiboxAppId = nameMsg.text
                     // await bot.sendMessage(msg.chat.id, `Mobibox App Id:  ${appId}!`);
                     if (mobiboxAppId && mobiboxNetworkId){
                         await bot.sendMessage(msg.chat.id, `Please wait while we are authenticating your access!`);
                         await authenticateUser(msg.chat.id);
                     }
                 });
             });
         
         });
         
         bot.onText(/\/tiktok/, async msg => { 

            await bot.sendMessage(msg.chat.id, `Please authorized`);

         
             if (!authorized){
                 await bot.sendMessage(msg.chat.id, `Please login first in order to access the bot features!`);
                 return;
             } 
             
         
         
             const packageName = await bot.sendMessage(msg.chat.id, `Please share your App package name`, {
                 reply_markup: {
                     force_reply: true,
                 },
             });
             bot.onReplyToMessage(msg.chat.id, packageName.message_id, async (nameMsg) => {
                 const packageName = nameMsg.text;
                 // save name in DB if you want to ...
                 await bot.sendMessage(msg.chat.id, `Package Name:  ${packageName}!`);
         
                 mobiboxAppPackageName = packageName;
         
                 const platform = await bot.sendMessage(msg.chat.id, `Please enter your App platform: /android or /ios`, {
                     reply_markup: {
                         force_reply: true,
                     },
                 });
         
                 bot.onReplyToMessage(msg.chat.id, platform.message_id, async (nameMsg) => {
                     const platform = nameMsg.text.replace("/","")
                     mobiboxAppPlatform = platform;
         
                     await bot.sendMessage(msg.chat.id, `your App platform is:  ${platform}!`);
         
                     await bot.sendMessage(msg.chat.id, `Please wait for few seconds until we get your app data!`);
         
                     if ( await getAppFromAdjust(mobiboxAppPackageName, mobiboxAppPlatform, msg.chat.id)){
                         const action = await bot.sendMessage(msg.chat.id, `Please add your new tiktok ids?`, {
                             reply_markup: {
                                 force_reply: true,
                             },
                         });
                         
                         bot.onReplyToMessage(msg.chat.id, action.message_id, async (nameMsg) => {
                             let tiktokAppId =  nameMsg.text+","+channelSetup;
                             addAppToAdjust(tiktokAppId, msg.chat.id);
                         });
                     }
         
                 });
             });
         
         });

        if (event && event.body) {
             bot.processUpdate(JSON.parse(event.body));
        }
        // Return a success response
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Update processed successfully' })
        };
    } catch (error) {
        // Handle errors
        console.error('Error occured:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};



module.exports.setWebhook = async event => {
    try {
  
        let url = 'https://' + event.headers.Host + '/' + event.requestContext.stage + '/telegramBotAppSettings';
  
        await bot.setWebhook(url);
  
        return {
            statusCode: 200,
            headers: getResponseHeaders(),
            body: JSON.stringify({url: url})
        };
  
    } catch (err) {
        console.log("Error: ", err);
        return {
            statusCode: err.statusCode ? err.statusCode : 500,
            headers: getResponseHeaders(),
            body: JSON.stringify({
                error: err.name ? err.name : "Exception",
                message: err.message ? err.message : "Unknown error"
            })
        };
    }
  }



exports.handler()
    .then(response => console.log(response))
    .catch(error => console.error(error));