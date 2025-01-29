

// const BASE_URL = `${window.location.protocol}//${window.location.hostname}/api/`;
// // const BASE_URL = "https://app.snowie.ai/api/";
// // const BASE_URL = "https://2xjx88w4-8000.inc1.devtunnels.ms/api/";
// // const BASE_URL = "https://f8bz4zd6-8000.inc1.devtunnels.ms/api/";
// // const BASE_URL = "https://xjs6k34l-8000.inc1.devtunnels.ms/api/";
// // const BASE_URL = "https://e739-2401-4900-1c23-67ab-8132-9612-7bc-ae8f.ngrok-free.app/api/";
// // const BASE_URL="https://xjs6k34l-8000.inc1.devtunnels.ms/api/"
// // const BASE_URL=import.meta.env.VITE_BASE_URL;
// // Utility function to get data from localStorage or fallback to cookies
// // const getFromLocalStorageOrCookie = (key: any, cookieFallback: any) => {
// //   const localValue = localStorage.getItem(key);
// //   return localValue !== null ? localValue : getCookie(cookieFallback);
// // };

// export const axiosConfig = {
//   baseURL: BASE_URL,
//   headers: {
//     get "schema-name"() {
//       return (
//         getFromLocalStorageOrCookie("schema_name", "schema_name") ||
//         "default-schema"
//       );
//     },
//     get Authorization() {
//       const token = getFromLocalStorageOrCookie("access_token", "access_token");
//       return token ? `Bearer ${token}` : "";
//     },
//   },
// };

// export const axiosConfig2 = {
//   baseURL: BASE_URL,
//   headers: {
//     get Authorization() {
//       const token = getFromLocalStorageOrCookie("access_token", "access_token");
//       return token ? `Bearer ${token}` : "";
//     },
//   },
// };
const baseurl = `https://app.snowie.ai`;
export const axiosConfig3 = {
  baseURL: baseurl,
};
