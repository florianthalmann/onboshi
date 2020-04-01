import fetch from 'node-fetch';
import { exec } from 'child_process';

export async function mapSeries<T,S>(array: T[], func: (arg: T, i?: number) => Promise<S>): Promise<S[]> {
  let result = [];
  for (let i = 0; i < array.length; i++) {
    result.push(await func(array[i], i));
  }
  return result;
}

export function toMap<T,U>(...keysAndValues: [T,U][]) {
  const map = new Map<T,U>();
  keysAndValues.forEach(([k,v]) => map.set(k, v));
  return map;
}

export async function execute(command: string, log = false) {
  let options = {shell: '/bin/bash'};//{stdio: ['pipe', 'pipe', 'ignore']};
  return new Promise<void>((resolve, reject) =>
    exec(command, options, (error, stdout, stderr) => {
      if (error) {
        console.log(stderr);
        reject();
      } else {
        if (log) console.log(stdout);
        resolve();
      }
    }));
}

export async function fetchJson(uri: string) {
  return (await fetch(uri)).json();
}