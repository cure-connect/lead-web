export const createLeadApi = async (payload: any) => {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/createleads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": import.meta.env.VITE_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Create lead failed");
  }

  return res.json();
};
