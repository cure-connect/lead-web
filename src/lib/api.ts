export const createLeadApi = async (payload: any) => {
  const res = await fetch("http://localhost:3000/lead/v1/api/createleads", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": "cureconnectkeytoken12345",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Create lead failed");
  }

  return res.json();
};
