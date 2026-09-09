import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
    try { return nextResolve(specifier + '.ts', context); } catch {}
  }
  return nextResolve(specifier, context);
} });
