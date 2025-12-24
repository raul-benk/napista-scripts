import axios from "axios";

const PIT_TOKEN = "pit-935ef471-2d01-45fe-8707-3097a056e790";
const LOCATION_ID = "EJoBWKAGbBtYNTMkbLXD";

const api = axios.create({
  baseURL: "https://services.leadconnectorhq.com",
  headers: {
    Authorization: `Bearer ${PIT_TOKEN}`,
    Version: "2021-07-28",
    "Content-Type": "application/json"
  }
});

async function getPipelines() {
  try {
    const response = await api.get("/opportunities/pipelines", {
      params: {
        locationId: LOCATION_ID
      }
    });

    console.log("✅ Pipelines encontrados:");
    console.dir(response.data, { depth: null });

  } catch (error) {
    console.error("❌ Erro ao buscar pipelines");

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Resposta:", error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

getPipelines();
