export default function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=3600');
  res.status(200).json({ googleClientId: process.env.GOOGLE_CLIENT_ID || null });
}
