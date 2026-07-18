import { apiRequest } from "./client";

export async function installSystem({ token, dbName, dbUser, dbPassword }) {
  return apiRequest("/system/install", {
    method: "POST",
    body: {
      token,
      dbName,
      dbUser,
      dbPassword,
    },
  });
}
