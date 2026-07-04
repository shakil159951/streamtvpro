const url = '/api/proxy?u=https%3A%2F%2Fowrcovcrpy.gpcdn.net%2Fbpk-tv%2F1709%2Foutput%2Findex.m3u8';
const ext = url.split('?')[0].split('.').pop()?.toLowerCase() || '';
console.log(ext);
