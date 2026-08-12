import { ConfidentialClientApplication } from "@azure/msal-node";
import { Client } from "@microsoft/microsoft-graph-client";
import "isomorphic-fetch";

const cca = new ConfidentialClientApplication({
  auth: {
    clientId: process.env.MS_CLIENT_ID,
    clientSecret: process.env.MS_CLIENT_SECRET,
    authority: `https://login.microsoftonline.com/${process.env.MS_TENANT_ID}`,
  },
});

async function getAccessToken() {
  const result = await cca.acquireTokenByClientCredential({
    scopes: ["https://graph.microsoft.com/.default"],
  });

  if (!result) {
    throw new Error("Unable to acquire Microsoft Graph access token.");
  }

  return result.accessToken;
}

export async function getGraphClient() {
  const token = await getAccessToken();

  return Client.init({
    authProvider: (done) => {
      done(null, token);
    },
  });
}