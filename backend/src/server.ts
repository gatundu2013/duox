import "./config/env";
import { connectDatabase } from "./db/connection/postgres";

import { MultiplierGenerator } from "./services/game/multiplier/multiplier-generator";

const x = new MultiplierGenerator();

connectDatabase();

// console.log(x.generateResults("hellothere", []));
