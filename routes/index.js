const express = require("express");
const router = express.Router();

// 라우트 파일들을 import
const portfolioRoutes = require("./portfolioRoutes");
const authRoutes = require("./authRoute");
const techStackRoutes = require("./techStackRoute");

// API 라우트 설정
router.use("/portfolios", portfolioRoutes);
router.use("/auth", authRoutes);
router.use("/techstacks", techStackRoutes);

module.exports = router;