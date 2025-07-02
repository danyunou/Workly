const express = require('express');
const router = express.Router();

router.get('/ping', (req, res) => {
  res.send("✅ Backend activo");
});

module.exports = router;
