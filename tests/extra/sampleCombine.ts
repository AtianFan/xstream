/// <reference path="../../typings/globals/mocha/index.d.ts" />
/// <reference path="../../typings/globals/node/index.d.ts" />
import xs, {Stream} from '../../src/index';
import sampleCombine from '../../src/extra/sampleCombine';
import * as assert from 'assert';

describe('sampleCombine (extra)', () => {
  it('should combine AND-style two streams together', (done) => {
    const stream1 = xs.periodic(100).take(3);
    const stream2 = xs.periodic(99).take(3);
    const stream = sampleCombine(stream1, stream2);
    let expected = [[0, 0], [1, 1], [2, 2]];
    stream.addListener({
      next: (x) => {
        const e = expected.shift();
        assert.equal(x[0], e[0]);
        assert.equal(x[1], e[1]);
      },
      error: done,
      complete: () => {
        assert.equal(expected.length, 0);
        done();
      },
    });
  });

  it('should have correct TypeScript signature', (done) => {
    const stream1 = xs.create<string>({
      start: listener => {},
      stop: () => {}
    });

    const stream2 = xs.create<string>({
      start: listener => {},
      stop: () => {}
    });

    const combined: Stream<[string, string]> = sampleCombine(stream1, stream2);
    done();
  });

  it('should complete only when the sample stream has completed', (done) => {
    const stream1 = xs.periodic(100).take(4);
    const stream2 = xs.periodic(99).take(1);
    const stream = sampleCombine(stream1, stream2).map(arr => arr.join(''));
    let expected = ['00', '10', '20', '30'];
    stream.addListener({
      next: (x) => {
        assert.equal(x, expected.shift());
      },
      error: done,
      complete: () => {
        assert.equal(expected.length, 0);
        done();
      },
    });
  });

  it('should emit an empty array if combining zero streams', (done) => {
    const stream = sampleCombine();

    stream.addListener({
      next: (a) => {
        assert.equal(Array.isArray(a), true);
        assert.equal(a.length, 0);
      },
      error: done,
      complete: () => {
        done();
      },
    });
  });

  it('should just wrap the value if combining one stream', (done) => {
    const source = xs.periodic(100).take(3);
    const stream = sampleCombine(source);
    let expected = [[0], [1], [2]];

    stream.addListener({
      next: (x) => {
        const e = expected.shift();
        assert.equal(x[0], e[0]);
      },
      error: done,
      complete: () => {
        assert.equal(expected.length, 0);
        done();
      },
    });
  });

  it('should not break future listeners when SampleCombineProducer tears down', (done) => {
    //     --0---1--2---|  innerA
    //     ----0----1---|  innerB
    // ----0-----1--2---|  outer
    // ------00--11-12--|  stream
    const innerA = xs.create<number>();
    const innerB = xs.create<number>();
    const outer = xs.create<number>();
    const arrayInners: Array<Stream<number>> = [];
    const stream = outer
      .map(x => {
        return sampleCombine(...arrayInners)
          .map(combination => `${x}${combination.join('')}`);
      })
      .flatten();
    const expected = ['00', '11', '12'];

    setTimeout(() => {
      arrayInners.push(innerA);
      outer.shamefullySendNext(0);
    }, 100);
    setTimeout(() => {
      innerA.shamefullySendNext(0);
    }, 150);
    setTimeout(() => {
      innerB.shamefullySendNext(0);
    }, 175);
    setTimeout(() => {
      arrayInners.push(innerB);
      outer.shamefullySendNext(1);
      innerA.shamefullySendNext(1);
    }, 200);
    setTimeout(() => {
      innerA.shamefullySendNext(2);
      outer.shamefullySendNext(2);
      innerB.shamefullySendNext(1);
    }, 250);
    setTimeout(() => {
      innerA.shamefullySendComplete();
      innerB.shamefullySendComplete();
      outer.shamefullySendComplete();
    }, 550);

    stream.addListener({
      next: (x: string) => {
        assert.equal(x, expected.shift());
      },
      error: (err: any) => done(err),
      complete: () => {
        assert.equal(expected.length, 0);
        done();
      },
    });
  });

  it('should return a Stream when combining a MemoryStream with a Stream', (done) => {
    const input1 = xs.periodic(80).take(4).remember();
    const input2 = xs.periodic(50).take(3);
    const stream: Stream<[number, number]> = sampleCombine(input1, input2);
    assert.strictEqual(stream instanceof Stream, true);
    done();
  });

  it('should return a Stream when combining a MemoryStream with a MemoryStream', (done) => {
    const input1 = xs.periodic(80).take(4).remember();
    const input2 = xs.periodic(50).take(3).remember();
    const stream: Stream<[number, number]> = sampleCombine(input1, input2);
    assert.strictEqual(stream instanceof Stream, true);
    done();
  });
});
