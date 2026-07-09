import { Injectable } from '@nestjs/common';
import { AntiCheatInput, AntiCheatVerdict } from './anti-cheat.types';
import { validateCoherence, validateHeartrate, validateOrigin, validateSpeed } from './validators';

const VALIDATORS = [validateOrigin, validateSpeed, validateCoherence, validateHeartrate];

@Injectable()
export class AntiCheatService {
  evaluate(input: AntiCheatInput): AntiCheatVerdict {
    for (const validate of VALIDATORS) {
      const reason = validate(input);
      if (reason) {
        return { approved: false, reason };
      }
    }
    return { approved: true };
  }
}
