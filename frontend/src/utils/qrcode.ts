

/** Số byte sửa lỗi của mỗi khối, mức M, phiên bản 1 – 10 */
const ECC_PER_BLOCK = [10, 16, 26, 18, 24, 16, 18, 22, 22, 26];

/** Số khối sửa lỗi, mức M, phiên bản 1 – 10 */
const NUM_BLOCKS = [1, 1, 1, 2, 2, 4, 4, 4, 5, 5];

const MAX_VERSION = ECC_PER_BLOCK.length;

/** Số ô dùng cho dữ liệu + sửa lỗi của một phiên bản (đã trừ các hoa văn cố định) */
function rawDataModules(version: number): number {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const alignCount = Math.floor(version / 7) + 2;
    result -= (25 * alignCount - 10) * alignCount - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

/** Số byte dữ liệu thực (đã trừ byte sửa lỗi) mà một phiên bản chứa được */
function dataCodewords(version: number): number {
  return Math.floor(rawDataModules(version) / 8) - ECC_PER_BLOCK[version - 1] * NUM_BLOCKS[version - 1];
}

/** Nhân hai số trong trường GF(2^8) với đa thức 0x11D */
function gfMultiply(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

/** Hệ số của đa thức sinh Reed–Solomon bậc `degree` */
function reedSolomonDivisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMultiply(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = gfMultiply(root, 0x02);
  }
  return result;
}

/** Phần dư khi chia dữ liệu cho đa thức sinh — chính là các byte sửa lỗi */
function reedSolomonRemainder(data: number[], divisor: number[]): number[] {
  const result = new Array<number>(divisor.length).fill(0);
  for (const byte of data) {
    const factor = byte ^ (result.shift() as number);
    result.push(0);
    divisor.forEach((coefficient, i) => {
      result[i] ^= gfMultiply(coefficient, factor);
    });
  }
  return result;
}

/** Chia dữ liệu thành khối, thêm byte sửa lỗi rồi xen kẽ các khối theo chuẩn */
function addErrorCorrection(data: number[], version: number): number[] {
  const blockCount = NUM_BLOCKS[version - 1];
  const eccLength = ECC_PER_BLOCK[version - 1];
  const rawCodewords = Math.floor(rawDataModules(version) / 8);
  const shortBlockCount = blockCount - (rawCodewords % blockCount);
  const shortBlockLength = Math.floor(rawCodewords / blockCount);
  const divisor = reedSolomonDivisor(eccLength);

  const blocks: number[][] = [];
  let offset = 0;
  for (let i = 0; i < blockCount; i++) {
    const length = shortBlockLength - eccLength + (i < shortBlockCount ? 0 : 1);
    const block = data.slice(offset, offset + length);
    offset += length;
    const ecc = reedSolomonRemainder(block, divisor);
    // Khối ngắn chèn một ô trống để mọi khối dài bằng nhau khi xen kẽ
    if (i < shortBlockCount) block.push(-1);
    blocks.push(block.concat(ecc));
  }

  const result: number[] = [];
  for (let i = 0; i < blocks[0].length; i++) {
    for (const block of blocks) {
      if (block[i] !== -1) result.push(block[i]);
    }
  }
  return result;
}

/** Toạ độ tâm các hoa văn căn chỉnh của một phiên bản */
function alignmentPositions(version: number): number[] {
  if (version === 1) return [];
  const count = Math.floor(version / 7) + 2;
  const size = version * 4 + 17;
  const step = Math.ceil((version * 4 + 4) / (count * 2 - 2)) * 2;
  const result = [6];
  for (let position = size - 7; result.length < count; position -= step) result.splice(1, 0, position);
  return result;
}

/** 8 mặt nạ chuẩn: ô (x, y) nào thỏa điều kiện thì bị đảo màu */
const MASKS: ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

/** Điểm phạt của một ma trận: dãy cùng màu dài, khối 2×2 cùng màu, lệch tỉ lệ đen – trắng */
function penalty(modules: boolean[][]): number {
  const size = modules.length;
  let score = 0;
  let dark = 0;
  for (let a = 0; a < size; a++) {
    let rowRun = 1;
    let columnRun = 1;
    for (let b = 0; b < size; b++) {
      if (modules[a][b]) dark++;
      if (b > 0) {
        rowRun = modules[a][b] === modules[a][b - 1] ? rowRun + 1 : 1;
        columnRun = modules[b][a] === modules[b - 1][a] ? columnRun + 1 : 1;
        if (rowRun === 5) score += 3;
        else if (rowRun > 5) score++;
        if (columnRun === 5) score += 3;
        else if (columnRun > 5) score++;
      }
      if (a > 0 && b > 0) {
        const color = modules[a][b];
        if (color === modules[a - 1][b] && color === modules[a][b - 1] && color === modules[a - 1][b - 1]) score += 3;
      }
    }
  }
  return score + Math.floor(Math.abs((dark * 20) / (size * size) - 10)) * 10;
}

/**
 * Mã hoá một chuỗi thành ma trận QR.
 * @returns ma trận vuông, `true` là ô đen; chưa gồm viền trắng chung quanh
 * @throws nếu chuỗi dài quá sức chứa của phiên bản 10
 */
export function encodeQr(text: string): boolean[][] {
  const bytes = Array.from(new TextEncoder().encode(text));

  // Chọn phiên bản nhỏ nhất chứa đủ: 4 bit kiểu + 8 hoặc 16 bit độ dài + dữ liệu
  let version = 1;
  for (; ; version++) {
    if (version > MAX_VERSION) throw new RangeError("Nội dung quá dài để tạo mã QR");
    const lengthBits = version < 10 ? 8 : 16;
    if (4 + lengthBits + bytes.length * 8 <= dataCodewords(version) * 8) break;
  }

  // ── Dãy bit dữ liệu ──
  const capacityBits = dataCodewords(version) * 8;
  const bits: number[] = [];
  const pushBits = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  pushBits(0b0100, 4); // kiểu dữ liệu: byte
  pushBits(bytes.length, version < 10 ? 8 : 16);
  bytes.forEach((byte) => pushBits(byte, 8));
  pushBits(0, Math.min(4, capacityBits - bits.length)); // dấu kết thúc
  pushBits(0, (8 - (bits.length % 8)) % 8); // làm tròn đủ byte
  // Lấp chỗ trống bằng hai byte đệm 0xEC, 0x11 xen kẽ
  for (let pad = 0xec; bits.length < capacityBits; pad ^= 0xec ^ 0x11) pushBits(pad, 8);

  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    data.push(bits.slice(i, i + 8).reduce((byte, bit) => (byte << 1) | bit, 0));
  }
  const codewords = addErrorCorrection(data, version);

  // Ma trận và các hoa văn cố định
  const size = version * 4 + 17;
  const modules = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const reserved = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const setFunction = (x: number, y: number, dark: boolean) => {
    modules[y][x] = dark;
    reserved[y][x] = true;
  };

  // Hai đường định thời
  for (let i = 0; i < size; i++) {
    setFunction(6, i, i % 2 === 0);
    setFunction(i, 6, i % 2 === 0);
  }
  // Ba hoa văn định vị ở góc, kèm viền trắng
  for (const [centerX, centerY] of [
    [3, 3],
    [size - 4, 3],
    [3, size - 4],
  ]) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;
        if (x < 0 || x >= size || y < 0 || y >= size) continue;
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        setFunction(x, y, distance !== 2 && distance !== 4);
      }
    }
  }
  // Hoa văn căn chỉnh (bỏ ba vị trí trùng hoa văn định vị)
  const align = alignmentPositions(version);
  align.forEach((centerY, i) => {
    align.forEach((centerX, j) => {
      const last = align.length - 1;
      if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          setFunction(centerX + dx, centerY + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    });
  });

  /** Ghi 15 bit định dạng (mức sửa lỗi M + số mặt nạ) vào hai vị trí quy định */
  const drawFormat = (mask: number) => {
    const formatData = mask; // mức M có mã 00 nên chỉ còn số mặt nạ
    let remainder = formatData;
    for (let i = 0; i < 10; i++) remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
    const formatBits = ((formatData << 10) | remainder) ^ 0x5412;
    const bit = (i: number) => ((formatBits >>> i) & 1) !== 0;

    for (let i = 0; i <= 5; i++) setFunction(8, i, bit(i));
    setFunction(8, 7, bit(6));
    setFunction(8, 8, bit(7));
    setFunction(7, 8, bit(8));
    for (let i = 9; i < 15; i++) setFunction(14 - i, 8, bit(i));

    for (let i = 0; i < 8; i++) setFunction(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) setFunction(8, size - 15 + i, bit(i));
    setFunction(8, size - 8, true);
  };
  drawFormat(0); // giữ chỗ trước khi rải dữ liệu

  // Thông tin phiên bản (từ phiên bản 7)
  if (version >= 7) {
    let remainder = version;
    for (let i = 0; i < 12; i++) remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1f25);
    const versionBits = (version << 12) | remainder;
    for (let i = 0; i < 18; i++) {
      const dark = ((versionBits >>> i) & 1) !== 0;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      setFunction(a, b, dark);
      setFunction(b, a, dark);
    }
  }

  //Rải dữ liệu theo đường dích dắc từ góc dưới phải
  let bitIndex = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vertical = 0; vertical < size; vertical++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vertical : vertical;
        if (!reserved[y][x] && bitIndex < codewords.length * 8) {
          modules[y][x] = ((codewords[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1) !== 0;
          bitIndex++;
        }
      }
    }
  }

  // Thử cả 8 mặt nạ, giữ mặt nạ ít điểm phạt nhất ─
  const applyMask = (mask: number) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (!reserved[y][x] && MASKS[mask](x, y)) modules[y][x] = !modules[y][x];
      }
    }
  };
  let bestMask = 0;
  let bestPenalty = Infinity;
  for (let mask = 0; mask < MASKS.length; mask++) {
    applyMask(mask);
    drawFormat(mask);
    const score = penalty(modules);
    if (score < bestPenalty) {
      bestPenalty = score;
      bestMask = mask;
    }
    applyMask(mask); // XOR lần hai để gỡ mặt nạ
  }
  applyMask(bestMask);
  drawFormat(bestMask);

  return modules;
}
