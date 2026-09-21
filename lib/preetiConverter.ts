/**
 * Preeti to Unicode Devanagari Converter
 * Optimized for Nepali Government textbooks (Curriculum Development Centre / Janak Shiksha)
 */

// Mapping of multi-character sequences in Preeti
const PREETI_COMPOUNDS_RAW: [string, string][] = [
  // Full phrases & titles
  ['1.0 k\'g/jnf]sg (Review)', '१.० पुनरवलोकन (Review)'],
  ['1.0 k\'g/jnf]sg', '१.० पुनरवलोकन'],
  ['k\'g/jnf]sg (Review)', 'पुनरवलोकन (Review)'],
  ['k\'g/jnf]sg', 'पुनरवलोकन'],
  ['1.1 cnlUuPsf / vlK6Psf ;d"x (Disjoint and Overlapping sets)', '१.१ अलग्गिएका र खप्टिएका समूह (Disjoint and Overlapping sets)'],
  ['cnlUuPsf / vlK6Psf ;d"x', 'अलग्गिएका र खप्टिएका समूह'],
  ['cnlUuPsf ;d"x', 'अलग्गिएका समूह'],
  ['vlK6Psf ;d"x', 'खप्टिएका समूह'],
  ['cnlUuPsf', 'अलग्गिएका'],
  ['vlK6Psf', 'खप्टिएका'],
  [';j{Jofks ;d"x', 'सर्वव्यापक समूह'],
  [';j{Jofks', 'सर्वव्यापक'],
  [';"rLs/0f ljlwaf6', 'सूचीकरण विधिबाट'],
  [';"rLs/0f ljlw', 'सूचीकरण विधि'],
  [';"rLs/0f', 'सूचीकरण'],
  ['ljlwaf6', 'विधिबाट'],
  ['ljlw', 'विधि'],
  ['lgdf{0f ug\'{xf];\\', 'निर्माण गर्नुहोस्'],
  ['lgdf{0f ug\'{xf];', 'निर्माण गर्नुहोस्'],
  ['lgdf{0f', 'निर्माण'],
  ['df{0f', 'र्माण'],
  ['ug\'{xf];\\', 'गर्नुहोस्'],
  ['ug\'{xf];', 'गर्नुहोस्'],
  ['ug\'{', 'गर्नु'],
  ['lbOPsf k|Zgdf', 'दिइएका प्रश्नमा'],
  ['lbOPsf', 'दिइएका'],
  ['k|Zgdf', 'प्रश्नमा'],
  ['5nkmn ug\'{xf];\\', 'छलफल गर्नुहोस्'],
  ['5nkmn ug\'{xf];', 'छलफल गर्नुहोस्'],
  ['5nkmn', 'छलफल'],
  ['uGtLsf ;ª\\Vofx¿', 'गन्तीका सङ्ख्याहरू'],
  ['uGtLsf ;ªVofx¿', 'गन्तीका सङ्ख्याहरू'],
  ['uGtLsf', 'गन्तीका'],
  [';Ddsf', 'सम्मका'],
  [';ª\\Vofx¿', 'सङ्ख्याहरू'],
  [';ªVofx¿', 'सङ्ख्याहरू'],
  [';ª\\Vof', 'सङ्ख्या'],
  [';ªVof', 'सङ्ख्या'],
  [';+Vof', 'संख्या'],
  ['¿9 ;ª\\Vofx¿', 'रूढ सङ्ख्याहरू'],
  ['lahf]/ ;ª\\Vofx¿', 'बिजोर सङ्ख्याहरू'],
  ['hf]/ ;ª\\Vofx¿', 'जोर सङ्ख्याहरू'],
  ['¿9', 'रूढ'],
  ['lahf]/', 'बिजोर'],
  ['hf]/', 'जोर'],
  ['ckjTo{x¿', 'अपवर्त्यहरू'],
  ['ckjTo{', 'अपवर्त्य'],
  ['u\'0fgv08x¿', 'गुणनखण्डहरू'],
  ['u\'0fgv08', 'गुणनखण्ड'],
  ['v08Ls/0f', 'खण्डीकरण'],
  ['v08', 'खण्ड'],
  [';+o\'St ;ª\\Vofx¿', 'संयुक्त सङ्ख्याहरू'],
  [';+o\'St', 'संयुक्त'],
  [';b:ox¿', 'सदस्यहरू'],
  [';b:o', 'सदस्य'],
  ['s:tf] ;d"x', 'कस्तो समूह'],
  ['s:tf]', 'कस्तो'],
  ['elgG5 <', 'भनिन्छ ?'],
  ['elgG5', 'भनिन्छ'],
  ['elG5', 'भनिन्छ'],
  [';d"x U', 'समूह U'],
  [';d"x', 'समूह'],
  ['sIff *', 'कक्षा ८'],
  ['sIff', 'कक्षा'],
  ['ul0ft', 'गणित'],
  ['kf7\\oj|md', 'पाठ्यक्रम'],
  ['kf7\oj|md', 'पाठ्यक्रम'],
  ['j|md', 'क्रम'],
  ['j|m', 'क्रम'],
  ['k|', 'प्र'],
  ['q|', 'त्र'],
  ['eStk\'/', 'भक्तपुर'],
  [';fgf]l7dL', 'सानोठिमी'],
  ['ljsf;', 'विकास'],
  ['s]Gb|', 'केन्द्र'],
  ['g]kfn', 'नेपाल'],
  [';/sf/', 'सरकार'],
  ['lzIff', 'शिक्षा'],
  ['lj1fg', 'विज्ञान'],
  ['k|ljlw', 'प्रविधि'],
  ['dGqfno', 'मन्त्रालय'],
  ['cEof;', 'अभ्यास'],
  ['lj|mofsnfk', 'क्रियाकलाप'],
  ['pbfx/0f', 'उदाहरण'],
  [';dfwfg', 'समाधान'],
  ['u\'0fg', 'गुणन'],
  ['e]glrq', 'भेनचित्र'],
  ['e]g lrq', 'भेन चित्र'],
  ['k"0f{', 'पूर्ण'],
  ['k"0ff{ª\\s', 'पूर्णाङ्क'],
  ['k"0ff{ªs', 'पूर्णाङ्क'],
  ['cfg\'kflts', 'आनुपातिक'],
  ['cgfg\'kflts', 'अनानुपातिक'],
  ['cg\'kft', 'अनुपात'],
  [';dfg\'kft', 'समानुपात'],
  ['gfkmf', 'नाफा'],
  ['gf]S;fg', 'नोक्सान'],
  ['P]lss', 'ऐकिक'],
  ['lgod', 'नियम'],
  [';fwf/0f', 'साधारण'],
  ['Aofh', 'ब्याज'],
  ['If]qkmn', 'क्षेत्रफल'],
  ['cfotg', 'आयतन'],
  ['3ftfª\\s', 'घाताङ्क'],
  ['3ft', 'घात'],
  ['aLhLo', 'बीजीय'],
  ['cleAo~hs', 'अभिव्यञ्जक'],
  ['cleJohs', 'अभिव्यञ्जक'],
  ['leGg', 'भिन्न'],
  [';lds/0f', 'समीकरण'],
  ['c;dfgtf', 'असमानता'],
  ['u|fkm', 'ग्राफ'],
  ['/]vf', 'रेखा'],
  ['sf]0f', 'कोण'],
  [';dtnLo', 'समतलीय'],
  ['cfs[lt', 'आकृति'],
  ['cg\'¿k', 'अनुरूप'],
  [';d¿k', 'समरूप'],
  ['7f];', 'ठोस'],
  ['j:t\'', 'वस्तु'],
  ['lgb]{zfª\\s', 'निर्देशाङ्क'],
  [';dldlt', 'सममिति'],
  ['6];]n];g', 'टेसेलेसन'],
  [':yfgfGt/0f', 'स्थानान्तरण'],
  ['lbzf', 'दिशा'],
  ['l:ylt', 'स्थिति'],
  [':s]n', 'स्केल'],
  ['8«f]ª\\u', 'ड्रइङ'],
  ['8«Oª', 'ड्रइङ'],
  ['tYofª\\s', 'तथ्याङ्क'],
  ['zf:q', 'शास्त्र'],
  ['ljifo;"rL', 'विषयसूची'],
  ['k[i7', 'पृष्ठ'],
  ['zLif{s', 'शीर्षक'],
  ['pk;d"x', 'उपसमूह'],
  ['pko\'St', 'उपयुक्त'],
  ['cg\'ko\'St', 'अनुपयुक्त'],
  ['vfnL', 'खाली'],
  ['k|Zg', 'प्रश्न'],
  ['pQ/', 'उत्तर'],
  ['kl/of]hgf', 'परियोजना'],
  ['sfo{', 'कार्य'],
  ['kl/ldlt', 'परिमिति'],
  ['Jof;', 'व्यास'],
  ['cw{Jof;', 'अर्धव्यास'],
  ['kl/lw', 'परिधि'],
  ['lqe\'h', 'त्रिभुज'],
  ['rt\'e\'{h', 'चतुर्भुज'],
  ['ju{', 'वर्ग'],
  ['cfot', 'आयात'],
  [';dfgfGt/', 'समानान्तर'],
  [';dafx\'', 'समबाहु'],
  [';dlåafx\'', 'समद्विबाहु'],
  [';dsf]0fL', 'समकोणी'],
  [';dnDa', 'समलम्ब'],
  ['rª\\uf', 'चङ्गा'],
  ['d=;=', 'म.स.'],
  ['n=;=', 'ल.स.'],
  ['k|To]s', 'प्रत्येक'],
  ['ljBfyL{', 'विद्यार्थी'],
  ['lzIfs', 'शिक्षक'],
  ['xfdL', 'हामी'],
  ['tnsf', 'तलका'],
  ['dflysf', 'माथिका'],
  ['kQf nufpg\'xf];\\', 'पत्ता लगाउनुहोस्'],
  ['kQf nufpg\'xf];', 'पत्ता लगाउनुहोस्'],
  ['kQf', 'पत्ता'],
  ['nufpg\'xf];\\', 'लगाउनुहोस्'],
  ['nufpg\'xf];', 'लगाउनुहोस्'],
  ['n]Vg\'xf];\\', 'लेख्नुहोस्'],
  ['n]Vg\'xf];', 'लेख्नुहोस्'],
  ['b]vfpg\'xf];\\', 'देखाउनुहोस्'],
  ['b]vfpg\'xf];', 'देखाउनुहोस्'],
  ['lgsfNg\'xf];\\', 'निकाल्नुहोस्'],
  ['lgsfNg\'xf];', 'निकाल्नुहोस्'],
  ['hfFRg\'xf];\\', 'जाँच्नुहोस्'],
  ['hfFRg\'xf];', 'जाँच्नुहोस्'],
  ['5\'6\\ofpg\'xf];\\', 'छुट्याउनुहोस्'],
  ['5\'6\\ofpg\'xf];', 'छुट्याउनुहोस्'],
  ['5\'6\\ofO{', 'छुट्याई'],
  [';ª\\s]t', 'सङ्केत'],
  ['efu', 'भाग'],
  ['hf]8', 'जोड'],
  ['36fp', 'घटाउ'],
  [';/n', 'सरल'],
  ['cfwf/', 'आधार'],
  ['prfO', 'उचाइ'],
  ['nDa', 'लम्ब'],
  ['s0f{', 'कर्ण'],
  ['ldl>t', 'मिश्रित'],
  ['bzdnj', 'दशमलव'],
  ['låcfwf/', 'द्विआधार'],
  ['k~rcfwf/', 'पञ्चआधार'],
  ['¿kfGt/0f', 'रूपान्तरण'],
  ['j}1flgs', 'वैज्ञानिक'],
  ['kb{5g\\', 'पर्दछन्'],
  ['kb{5g', 'पर्दछन्'],
  ['x\'G5g\\', 'हुन्छन्'],
  ['x\'G5g', 'हुन्छन्'],
  ['x\'G5', 'हुन्छ'],
  ['5g\\', 'छन्'],
  ['5g', 'छन्'],
  ['eP', 'भए'],
  ['olb', 'यदि'],
  ['t/', 'तर'],
  ['klg', 'पनि'],
  ['g}', 'नै'],
  ['s]', 'के'],
  ['s;/L', 'कसरी'],
  ['slt', 'कति'],
  ['s\'g', 'कुन'],
  ['lsg', 'किन'],
  ['h:t}', 'जस्तै'],
  ['To:t}', 'त्यस्तै'],
  ['To;}n]', 'त्यसैले'],
  ['t;y{', 'तसर्थ'],
  ['oxfF', 'यहाँ'],
  ['ToxfF', 'त्यहाँ'],
  ['clg', 'अनि'],
  ['afFsL', 'बाँकी'],
  ['k\'gM', 'पुनः'],
  ['ca', 'अब'],
  ['ctM', 'अतः'],
  ['kf7', 'पाठ'],
  ['nfO{', 'लाई'],
  ['eO{', 'भई'],
  ['x¿', 'हरू'],
  ['x\'g\\', 'हुन्'],
  ['x\'g', 'हुन्'],
  ['0f', 'ण'],
  ['08', 'ण्ड'],
  // Reph after syllables
  [';j{', 'सर्व'],
  ['j{', 'र्व'],
  ['d{', 'र्म'],
  ['y{', 'र्थ'],
  ['s{', 'र्क'],
  ['k{', 'र्प'],
  ['g{', 'र्न'],
  ['t{', 'र्त'],
];

// Sort compounds by descending length so longest match wins
const PREETI_COMPOUNDS = [...PREETI_COMPOUNDS_RAW].sort((a, b) => b[0].length - a[0].length);

// Single Preeti to Devanagari character map
const PREETI_CHAR_MAP: Record<string, string> = {
  '~': 'ञ्',
  '`': 'ञ',
  'q': 'त्र',
  'w': 'ध',
  'W': 'ध्',
  'e': 'भ',
  'E': 'भ्',
  'r': 'च',
  'R': 'च्',
  't': 'त',
  'T': 'त्',
  'y': 'थ',
  'Y': 'थ्',
  'u': 'ग',
  'U': 'उ',
  'i': 'ष',
  'I': 'क्ष',
  'o': 'य',
  'p': 'प',
  'P': 'प्',
  '[': 'ृ',
  ']': 'े',
  '\\': '्',
  'a': 'ब',
  'A': 'ब्',
  's': 'क',
  'S': 'क्',
  'd': 'म',
  'D': 'म्',
  'f': 'ा',
  'g': 'न',
  'G': 'न्',
  'h': 'ज',
  'H': 'ज्',
  'j': 'व',
  'J': 'व्',
  'k': 'प',
  'K': 'प्',
  'l': 'ि',
  ';': 'स',
  "'": 'ु',
  'z': 'श',
  'Z': 'श्',
  'x': 'ह',
  'c': 'अ',
  'C': 'ऋ',
  'v': 'ख',
  'V': 'ख्',
  'b': 'द',
  'B': 'द्',
  'n': 'ल',
  'N': 'ल्',
  'm': 'म्',
  'O': 'इ',
  ',': ',',
  '.': '।',
  '/': 'र',
  '{': 'र्',
  '}': 'ै',
  '|': '्र',
  'F': 'ँ',
  'L': 'ी',
  ':': 'ः',
  '"': 'ू',
  '<': '?',
  '>': 'श्र',
  '?': 'रु',
  '+': 'ं',
  '¿': 'रू',
  '±': '±',
};

export function isPreetiText(text: string): boolean {
  if (!text || typeof text !== 'string') return false;

  const preetiMarkers = [
    ';d"x',
    'k\'g/jnf]sg',
    'cEof;',
    'sIff',
    'ul0ft',
    'lj|mofsnfk',
    'olb',
    'tnsf',
    'lbOPsf',
    'dflysf',
    'ug\'{xf];',
    'n]Vg\'xf];',
    'x\'G5',
    'ePsf',
    'k|Zg',
    'e]glrq',
    'If]qkmn',
    ';dfwfg',
    'pbfx/0f',
  ];

  for (const marker of preetiMarkers) {
    if (text.includes(marker)) {
      return true;
    }
  }

  return false;
}

/**
 * Converts Preeti text to readable Devanagari Unicode.
 */
export function preetiToUnicode(input: string): string {
  if (!input) return '';

  const preservedTokens: string[] = [];
  const makeToken = (content: string) => {
    const id = `___TOKEN${preservedTokens.length}___`;
    preservedTokens.push(content);
    return id;
  };

  let text = input;

  // Protect curly braces and set notation
  text = text.replace(/\{\s*/g, makeToken('{'));
  text = text.replace(/\s*\}/g, makeToken('}'));

  // Protect English phrases in parentheses like (Review), (Disjoint and Overlapping sets), (Set)
  text = text.replace(/\([A-Za-z0-9\s,\-\+\*\/]+\)/g, (match) => makeToken(match));

  // Protect sub-question labels like -s_ -> (क), -v_ -> (ख)
  text = text.replace(/-s_/g, makeToken('(क) '));
  text = text.replace(/-v_/g, makeToken('(ख) '));
  text = text.replace(/-u_/g, makeToken('(ग) '));
  text = text.replace(/-3_/g, makeToken('(घ) '));
  text = text.replace(/-ª_/g, makeToken('(ङ) '));
  text = text.replace(/-r_/g, makeToken('(च) '));
  text = text.replace(/-5_/g, makeToken('(छ) '));
  text = text.replace(/-h_/g, makeToken('(ज) '));
  text = text.replace(/-em_/g, makeToken('(झ) '));
  text = text.replace(/-`_/g, makeToken('(ञ) '));

  // Protect mathematical set names and isolated capital letters: A, B, C, D, E, U
  // e.g. "A =", "समूह A", "A, B", "(U)", "U sf"
  text = text.replace(/(^|[\s,(=])([A-Z])([\s,)=]|$)/g, (_m, pre, char, post) => {
    return `${pre}${makeToken(char)}${post}`;
  });

  // Step 1: Replace known common textbook phrases and technical compounds (longest first)
  for (const [preetiSeq, unicodeSeq] of PREETI_COMPOUNDS) {
    if (text.includes(preetiSeq)) {
      text = text.split(preetiSeq).join(unicodeSeq);
    }
  }

  // Step 2: Fix chhotii-i kar ('l') which in Preeti appears BEFORE the consonant
  text = text.replace(/l([s|v|u|3|r|5|h|t|y|b|w|g|k|a|e|d|o|\/|n|j|z|;|x|I|q])/g, (_match, p1) => {
    const devChar = PREETI_CHAR_MAP[p1] || p1;
    return devChar + 'ि';
  });

  // Step 3: Split into parts: preserved tokens stay as-is, rest converted
  const parts = text.split(/(___TOKEN\d+___)/g);
  const convertedParts = parts.map((part) => {
    if (part.startsWith('___TOKEN') && part.endsWith('___')) {
      return part;
    }
    const chars = Array.from(part);
    return chars
      .map((ch) => {
        if (/[\u0900-\u097F]/.test(ch)) return ch;
        return PREETI_CHAR_MAP[ch] || ch;
      })
      .join('');
  });

  let result = convertedParts.join('');

  // Restore preserved tokens
  preservedTokens.forEach((content, idx) => {
    result = result.split(`___TOKEN${idx}___`).join(content);
  });

  return result;
}

/**
 * Cleans and prepares textbook page text for AI consumption.
 */
export function formatTextbookPageText(rawText: string): {
  unicodeText: string;
  isPreeti: boolean;
  summaryNote: string;
} {
  const trimmed = (rawText || '').trim();
  if (!trimmed) {
    return {
      unicodeText: '',
      isPreeti: false,
      summaryNote: 'Empty or scanned page',
    };
  }

  const detectedPreeti = isPreetiText(trimmed);

  if (detectedPreeti) {
    const converted = preetiToUnicode(trimmed);
    return {
      unicodeText: converted,
      isPreeti: true,
      summaryNote: 'Converted from Preeti textbook font to Devanagari Unicode',
    };
  }

  return {
    unicodeText: trimmed,
    isPreeti: false,
    summaryNote: 'Direct Unicode text',
  };
}
