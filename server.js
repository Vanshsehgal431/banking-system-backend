import app from "./src/app.js";

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "banking system is running",
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port: ${PORT}`);
});
