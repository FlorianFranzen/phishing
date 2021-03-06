// Copyright 2020 @polkadot/phishing authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { HostList } from './types';

import { fetch } from '@polkadot/x-fetch';

// Equivalent to https://raw.githubusercontent.com/polkadot-js/phishing/master/all.json
const ALL_JSON = 'https://polkadot.js.org/phishing/all.json';
// 1 hour cache refresh
const CACHE_TIMEOUT = 1 * 60 * 60 * 1000;

let cacheEnd = 0;
let cacheList: HostList | null = null;

// gets the host-only part for a host
function extractHost (path: string): string {
  return path
    .replace(/https:\/\/|http:\/\/|wss:\/\/|ws:\/\//, '')
    .split('/')[0];
}

/**
 * Retrieve allow/deny from our list provider
 */
export async function retrieveHostList (allowCached = true): Promise<HostList> {
  const now = Date.now();

  if (allowCached && cacheList && (now < cacheEnd)) {
    return cacheList;
  }

  const response = await fetch(ALL_JSON);
  const list = (await response.json()) as HostList;

  cacheEnd = now + CACHE_TIMEOUT;
  cacheList = list;

  return list;
}

/**
 * Checks a host to see if it appears in the provided list
 */
export function checkHost (items: string[], host: string): boolean {
  const hostParts = extractHost(host).split('.').reverse();

  return items.some((item): boolean => {
    const checkParts = item.split('.').reverse();

    // first we need to ensure it has less or equal parts to our source
    if (checkParts.length > hostParts.length) {
      return false;
    }

    // ensure each section matches
    return checkParts.every((part, index) => hostParts[index] === part);
  });
}

/**
 * Determines if a host is in our deny list. Returns true if host is a problematic one. Returns
 * true if the host provided is in our list of less-than-honest sites.
 */
export async function checkIfDenied (host: string, allowCached = true): Promise<boolean> {
  try {
    const { deny } = await retrieveHostList(allowCached);

    return checkHost(deny, host);
  } catch (error) {
    console.error('Exception while checking host, assuming false');
    console.error(error);

    return false;
  }
}
