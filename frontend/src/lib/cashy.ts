export const CASHY_AVATARS = [
  {
    id: "hoodie",
    name: "Cashy Hoodie",
    path: "/cashy/cashy-hoodie.jpg",
    description: "Con gorra y tablet — ideal para el chat",
  },
  {
    id: "cape",
    name: "Cashy Cape",
    path: "/cashy/cashy-cape.jpg",
    description: "Con capa — look de superhéroe trading",
  },
] as const;

export const DEFAULT_CASHY_AVATAR = CASHY_AVATARS[0].path;

export function resolveAvatarUrl(url?: string | null) {
  return url || DEFAULT_CASHY_AVATAR;
}
