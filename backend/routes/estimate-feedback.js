const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/estimate_feedback/stats', async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT * FROM estimate_feedback ORDER BY created_at DESC`);
    
    if (rows.length === 0) {
      return res.json({
        totalFeedback: 0,
        accurateCount: 0,
        tooLowCount: 0,
        tooHighCount: 0,
        accuracyRate: 0,
        averagePriceDifference: 0,
        commonCorrectionReasons: [],
        feedbackByTreeSize: {
          small: { count: 0, avgDifference: 0 },
          medium: { count: 0, avgDifference: 0 },
          large: { count: 0, avgDifference: 0 },
          extraLarge: { count: 0, avgDifference: 0 }
        }
      });
    }

    const totalFeedback = rows.length;
    const accurateCount = rows.filter(r => r.feedback_rating === 'accurate').length;
    const tooLowCount = rows.filter(r => r.feedback_rating === 'too_low').length;
    const tooHighCount = rows.filter(r => r.feedback_rating === 'too_high').length;
    const accuracyRate = (accurateCount / totalFeedback) * 100;

    const feedbackWithActual = rows.filter(r => r.actual_price_quoted !== null);
    const avgDiff = feedbackWithActual.length > 0
      ? feedbackWithActual.reduce((sum, r) => {
          const aiMid = (parseFloat(r.ai_suggested_price_min) + parseFloat(r.ai_suggested_price_max)) / 2;
          return sum + Math.abs(parseFloat(r.actual_price_quoted) - aiMid);
        }, 0) / feedbackWithActual.length
      : 0;

    const reasonCounts = {};
    rows.forEach(r => {
      if (r.correction_reasons && Array.isArray(r.correction_reasons)) {
        r.correction_reasons.forEach(reason => {
          reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
        });
      }
    });
    const commonCorrectionReasons = Object.entries(reasonCounts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const feedbackByTreeSize = {
      small: { count: 0, totalDiff: 0, avgDifference: 0 },
      medium: { count: 0, totalDiff: 0, avgDifference: 0 },
      large: { count: 0, totalDiff: 0, avgDifference: 0 },
      extraLarge: { count: 0, totalDiff: 0, avgDifference: 0 }
    };

    feedbackWithActual.forEach(r => {
      const height = parseFloat(r.tree_height) || 0;
      const aiMid = (parseFloat(r.ai_suggested_price_min) + parseFloat(r.ai_suggested_price_max)) / 2;
      const diff = Math.abs(parseFloat(r.actual_price_quoted) - aiMid);
      
      let sizeCategory;
      if (height < 30) sizeCategory = 'small';
      else if (height < 60) sizeCategory = 'medium';
      else if (height < 80) sizeCategory = 'large';
      else sizeCategory = 'extraLarge';

      feedbackByTreeSize[sizeCategory].count++;
      feedbackByTreeSize[sizeCategory].totalDiff += diff;
    });

    Object.keys(feedbackByTreeSize).forEach(size => {
      const data = feedbackByTreeSize[size];
      data.avgDifference = data.count > 0 ? data.totalDiff / data.count : 0;
      delete data.totalDiff;
    });

    res.json({
      totalFeedback,
      accurateCount,
      tooLowCount,
      tooHighCount,
      accuracyRate: Math.round(accuracyRate * 10) / 10,
      averagePriceDifference: Math.round(avgDiff * 100) / 100,
      commonCorrectionReasons,
      feedbackByTreeSize
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

module.exports = router;
