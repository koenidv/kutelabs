declare global {
  interface Object {
    also<T>(this: T, block: (it: T) => void): T;
  }
}

Object.prototype.also = function<T>(this: T, block: (it: T) => void): T {
  block(this);
  return this;
};