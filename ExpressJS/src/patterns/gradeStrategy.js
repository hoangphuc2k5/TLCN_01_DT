/**
 * Strategy Pattern — grade average & classification
 */

const GRADE_WEIGHTS = {
  ORAL: 1,
  QUIZ_15: 1,
  MIDTERM: 2,
  FINAL: 3,
};

class GradeStrategy {
  calculateAverage(scores = []) {
    throw new Error('Not implemented');
  }

  classify(average) {
    throw new Error('Not implemented');
  }
}

class WeightedAverageStrategy extends GradeStrategy {
  calculateAverage(scores = []) {
    if (!scores.length) return null;
    let totalWeight = 0;
    let sum = 0;
    for (const item of scores) {
      const weight = item.weight || GRADE_WEIGHTS[item.type] || 1;
      sum += item.score * weight;
      totalWeight += weight;
    }
    if (!totalWeight) return null;
    return Math.round((sum / totalWeight) * 100) / 100;
  }

  classify(average) {
    if (average == null) return null;
    if (average >= 8) return 'Giỏi';
    if (average >= 6.5) return 'Khá';
    if (average >= 5) return 'Trung bình';
    return 'Yếu';
  }
}

class SimpleAverageStrategy extends GradeStrategy {
  calculateAverage(scores = []) {
    if (!scores.length) return null;
    const sum = scores.reduce((acc, s) => acc + s.score, 0);
    return Math.round((sum / scores.length) * 100) / 100;
  }

  classify(average) {
    if (average == null) return null;
    if (average >= 8) return 'Giỏi';
    if (average >= 6.5) return 'Khá';
    if (average >= 5) return 'Trung bình';
    return 'Yếu';
  }
}

const strategies = {
  weighted: new WeightedAverageStrategy(),
  simple: new SimpleAverageStrategy(),
};

const getGradeStrategy = (name = 'weighted') => strategies[name] || strategies.weighted;

module.exports = {
  GradeStrategy,
  WeightedAverageStrategy,
  SimpleAverageStrategy,
  getGradeStrategy,
  GRADE_WEIGHTS,
};
