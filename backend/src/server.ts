import "./config/env";

import { MultiplierGenerator } from "./services/game/multiplier/multiplier-generator";

const x = new MultiplierGenerator();

console.log(x.generateResults("hellothere", []));
