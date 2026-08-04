let acceptingTraffic = false;
let shuttingDown = false;

export const runtimeState = {
  markReady() {
    acceptingTraffic = true;
    shuttingDown = false;
  },
  markShuttingDown() {
    acceptingTraffic = false;
    shuttingDown = true;
  },
  isReady() {
    return acceptingTraffic && !shuttingDown;
  },
};
