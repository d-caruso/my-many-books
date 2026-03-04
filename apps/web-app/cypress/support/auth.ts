export type E2EUserRole = "admin" | "user";

export interface E2EUserProfile {
  id: number;
  email: string;
  name: string;
  surname: string;
  role: E2EUserRole;
  password: string;
  subject: string;
}

export interface E2EAuthTokens {
  accessToken: string;
  idToken: string;
  expiresIn: number;
}

const getEnvString = (key: string, fallback: string): string => {
  const value = Cypress.env(key);
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  return fallback;
};

export const getE2EUser = (role: E2EUserRole): E2EUserProfile => {
  if (role === "admin") {
    return {
      id: 1,
      email: getEnvString("adminEmail", "admin@example.com"),
      name: getEnvString("adminName", "Admin"),
      surname: getEnvString("adminSurname", "User"),
      role: "admin",
      password: getEnvString("adminPassword", "password123"),
      subject: getEnvString("adminEmail", "admin@example.com"),
    };
  }

  return {
    id: 2,
    email: getEnvString("userEmail", "reader@example.com"),
    name: getEnvString("userName", "Reader"),
    surname: getEnvString("userSurname", "User"),
    role: "user",
    password: getEnvString("userPassword", "password123"),
    subject: getEnvString("userEmail", "reader@example.com"),
  };
};

export const buildAuthTokens = (profile: E2EUserProfile): Cypress.Chainable<E2EAuthTokens> => {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresIn = 3600;
  const payload = {
    sub: profile.id.toString(),
    email: profile.email,
    given_name: profile.name,
    family_name: profile.surname,
    role: profile.role,
    iat: issuedAt,
    exp: issuedAt + expiresIn,
  };

  return cy.task<string>("auth:signToken", payload).then((token) => ({
    idToken: token,
    accessToken: token,
    expiresIn,
  }));
};

export const buildLoginResponse = (profile: E2EUserProfile, tokens: E2EAuthTokens) => {
  return {
    accessToken: tokens.accessToken,
    idToken: tokens.idToken,
    expiresIn: tokens.expiresIn,
    user: {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      surname: profile.surname,
      role: profile.role,
      isActive: true,
    },
  };
};

export const buildUserFromCredentials = (email: string, password: string): E2EUserProfile => {
  return {
    id: 99,
    email,
    name: "Test",
    surname: "User",
    role: "user",
    password,
    subject: email,
  };
};
