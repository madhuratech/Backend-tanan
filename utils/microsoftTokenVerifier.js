import jwksClient from "jwks-rsa";
import jwt from "jsonwebtoken";

// Lazily created — env vars are read after dotenv.config() has run.
let _client = null;

function getJwksClient(tenantId) {
    if (!_client) {
        _client = jwksClient({
            jwksUri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
            cache: true,
            rateLimit: true,
            jwksRequestsPerMinute: 5,
        });
    }
    return _client;
}


export const verifyMicrosoftIdToken = async (token) => {
    // Read env vars at call-time (after dotenv.config() has run)
    const tenantId = process.env.MS_TENANT_ID;
    const clientId = process.env.MS_CLIENT_ID;

    if (!tenantId) {
        throw new Error("MS_TENANT_ID is not configured on the server");
    }
    if (!clientId) {
        throw new Error("MS_CLIENT_ID is not configured on the server");
    }

    const client = getJwksClient(tenantId);

    return new Promise((resolve, reject) => {
        if (!token) {
            return reject(
                new Error("Microsoft ID token is required")
            );
        }

        // Decode only to obtain the signing-key ID.
        // Claims are NOT trusted until jwt.verify succeeds.
        const decodedToken = jwt.decode(token, {
            complete: true,
        });

        if (!decodedToken?.header?.kid) {
            return reject(
                new Error("Invalid Microsoft token structure")
            );
        }

        const kid = decodedToken.header.kid;

        client.getSigningKey(kid, (keyError, key) => {
            if (keyError) {
                return reject(
                    new Error(
                        `Failed to retrieve Microsoft signing key: ${keyError.message}`
                    )
                );
            }

            const signingKey = key.getPublicKey();
            const expectedIssuer =
                `https://login.microsoftonline.com/${tenantId}/v2.0`;

            jwt.verify(
                token,
                signingKey,
                {
                    algorithms: ["RS256"],

                  
                    audience: clientId,

                    issuer: expectedIssuer,
                },
                (verifyError, decoded) => {
                    if (verifyError) {
                        return reject(
                            new Error(
                                `Microsoft token verification failed: ${verifyError.message}`
                            )
                        );
                    }

                    // =========================
                    // Verify tenant claim
                    // =========================

                    const tokenTenantId = decoded.tid;

                    if (!tokenTenantId) {
                        return reject(
                            new Error(
                                "Microsoft token does not contain tenant ID"
                            )
                        );
                    }

                    if (
                        tokenTenantId.toLowerCase() !==
                        tenantId.toLowerCase()
                    ) {
                        return reject(
                            new Error(
                                "Microsoft token tenant does not match the configured tenant"
                            )
                        );
                    }

                    // =========================
                    // Microsoft Object ID
                    // =========================

                    const oid = decoded.oid;

                    if (!oid) {
                        return reject(
                            new Error(
                                "Microsoft token does not contain an object ID"
                            )
                        );
                    }

                    // =========================
                    // Get account identifier
                    // =========================

                    const email = (
                        decoded.preferred_username ||
                        decoded.email ||
                        decoded.upn ||
                        ""
                    )
                        .trim()
                        .toLowerCase();

                    if (!email) {
                        return reject(
                            new Error(
                                "Microsoft account email could not be determined"
                            )
                        );
                    }

                    // =========================
                    // Success
                    // =========================

                    resolve({
                        email,
                        name: decoded.name || "",
                        oid,
                        tenantId: tokenTenantId,
                    });
                }
            );
        });
    });
};