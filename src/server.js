import express from 'express';
import dotenv from 'dotenv';
import {
  exchangeCodeForToken,
  refreshToken,
  fetchMyUserData
} from './napista.js';

dotenv.config();

const app = express();

app.get('/napista/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({
      error: 'Authorization code não recebido'
    });
  }

  try {
    const tokenData = await exchangeCodeForToken(code);

    return res.json({
      success: true,
      message: 'Token gerado e armazenado com sucesso',
      expires_in: tokenData.expires_in
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: 'Erro ao obter token',
      details: error.response?.data || error.message
    });
  }
});

app.get('/refresh-token', async (req, res) => {
  try {
    const newTokenData = await refreshToken();
    res.json({
      success: true,
      message: 'Token renovado com sucesso.',
      new_expires_in: newTokenData.expires_in,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Erro ao renovar token',
      details: error.response?.data || error.message,
    });
  }
});

app.get('/test-api', async (req, res) => {
  try {
    const userData = await fetchMyUserData();
    res.json({
      success: true,
      message: 'Dados do usuário obtidos com sucesso.',
      data: userData,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Erro ao chamar a API protegida',
      details: error.response?.data || error.message,
    });
  }
});


app.listen(process.env.PORT, () => {
  console.log(`Servidor rodando na porta ${process.env.PORT}`);
});
