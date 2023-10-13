const express = require('express');
const axios = require('axios');
const url = require('url');
const app = express();

require('dotenv').config();
app.use(express.json());

var loginDetails = null;
const apiRootUrl = 'https://api.wxcc-us1.cisco.com';

//refresh token every 30 minutes
setInterval(async () => {
  try{
    const updatedToekn = await axios.post('https://webexapis.com/v1/access_token', {
    grant_type: 'refresh_token',
    client_id: `${process.env.WxCC_CLIENT_ID}`,
    client_secret: `${process.env.WxCC_CLIENT_SECRET}`,
    refresh_token: `${loginDetails.refresh_token}`
    })
    console.log(`Updated Token: ${JSON.stringify(updatedToekn.data)}`);
  }
  catch (error){
    console.log(`Error while refreshing token: ${error}`);
  }
}, 10000);

app.get('/', (req, res) => {
  res.json(loginDetails);
});

app.get('/authenticateWebex', (req, res) => {
  if (loginDetails) {
    res.json(loginDetails);
  } else {
    res.redirect('/login');
  }
});

app.get('/login', (req, res) => {
    console.log(`Redirecting to Webex Login Page, using Client ID: ${process.env.WxCC_CLIENT_ID}`);
    res.redirect(
        url.format({
        pathname: process.env.WXCC_AUTHORIZATION_LINK,
        query: {
            response_type: 'code',
            client_id: `${process.env.WxCC_CLIENT_ID}`,
            redirect_uri: `${process.env.WxCC_REDIRECT_URI}`,
            scope: `${process.env.WxCC_SCOPES}`,
            state: 'AudioConnector',
        },
        })
    );
});

app.get('/auth/logging', async (req, res) => {  
    const code = req.query.code ? req.query.code : null;
    const error = req.query.error
      ? `${req.query.error} ${req.query.error_description}`
      : null;
    //?code=_____
    if (!code) {
      console.error(
        `Error occured during the OAuth flow: missing CODE parameter`
      );
      console.error(`ERROR: ${error}`);
      res.status(500);
      res.send({ error: 'An error occured while fetching the code' });
    }
  
    console.log(`Fetched Code: ${code}`);
  
    // Get access Token - submit required payload
    const payload = {
      grant_type: 'authorization_code',
      client_id: `${process.env.WxCC_CLIENT_ID}`,
      redirect_uri: `${process.env.WxCC_REDIRECT_URI}`,
      client_secret: `${process.env.WxCC_CLIENT_SECRET}`,
      code: code
    };
    // Parameterize
    const data = Object.keys(payload)
      .map((key, index) => `${key}=${encodeURIComponent(payload[key])}`)
      .join('&');
  
    console.log(`Params: ${data}`);
  
    const response = await axios.post(
      'https://webexapis.com/v1/access_token',
      data,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
  
    console.log(`Got Response: ${JSON.stringify(response.data)}`);
  
    /*
     * Here is where you Fetch the Access Token, Refresh Token and also, "Org ID" can be derived from the access token.
     * You would usually persist this to a database. For the sample, we are storing it in a global variable in memory.
     * THIS IS NOT INTENDED FOR PRODUCTION USE - Please persist this to a cache or local datastore.
     */
    loginDetails = response.data
      ? response.data
      : { error: 'Error while fetching access token' };
  
    // You can fetch the Access Token, Cluster ID, Org ID from here
  
    let [accessToken, ciCluster, orgId] = loginDetails.access_token.split('_');
    console.log(`Got Access Token: ${accessToken}`);
    console.log(`Got Webex CI Cluster ID: ${ciCluster}`);
    console.log(`Got Org ID: ${orgId}`);
    // Redirect to Home to show you the access token.
    res.redirect('/');
});

app.get('/users', async (req, res) => {
    // Simple "GET Users" Sample. Change the DATES to fetch another range.
    // View the spec here :
  
    const options = {
      method: 'GET',
      url: `${apiRootUrl}/organization/${process.env.WxCC_ORG_ID}/user`,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${loginDetails.access_token}`,
      },
    };
  
    try {
      const response = await axios.request(options);
      console.log(response.data);
      res.json(response.data);
    } catch (error) {
      console.error(error);
      res.json({ error: error });
    }
});

app.listen(process.env.PORT, () => {
    console.log("Server Started at " + process.env.PORT)
});