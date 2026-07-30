export const authUserResponseSelect = {
  id: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
  profile: {
    select: {
      id: true,
      displayName: true,
      countryCode: true,
      interfaceLanguage: true,
      activeLanguagePairId: true,
    },
  },
} as const;
