const transitions = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['COMPLETED', 'CANCELLED'], // Master Guide fix: we use COMPLETED
  COMPLETED: [],
  CANCELLED: []
};

const canTransition = (current, next) => {
  return transitions[current]?.includes(next) || false;
};

module.exports = { canTransition };
