// Preloaded into the demo servers by scripts/visual-diff.mjs (node --import):
// the process clock starts at FIXED_CLOCK_START and then ticks normally, so two
// builds started minutes apart seed the same sample timestamps. Any version of
// the demo works, because nothing in it has to know.
const start = Date.parse(process.env.FIXED_CLOCK_START || '');

if (!Number.isNaN(start)) {
  const RealDate = Date;
  const offset = start - RealDate.now();
  class ShiftedDate extends RealDate {
    constructor(...args) {
      super(...(args.length ? args : [RealDate.now() + offset]));
    }
    static now() {
      return RealDate.now() + offset;
    }
  }
  globalThis.Date = ShiftedDate;
}
