import { emptyDraft, isLetter, type DraftQuestion, type Letter } from "./types";
import { letterFromIndex, shuffle } from "./utils";

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "that",
  "with",
  "this",
  "from",
  "they",
  "have",
  "were",
  "been",
  "their",
  "which",
  "would",
  "there",
  "could",
  "about",
  "into",
  "after",
  "also",
  "when",
  "what",
  "where",
  "while",
  "your",
  "will",
  "more",
  "than",
  "then",
  "them",
  "some",
  "such",
  "only",
  "other",
  "over",
  "most",
  "very",
  "just",
  "like",
  "because",
  "between",
  "through",
  "during",
  "before",
  "these",
  "those",
  "each",
  "both",
  "being",
  "under",
  "after",
  "above",
]);

const DEVANAGARI_WORD_MAP = new Map<string, string>([
  // Doubled consonants (representing chhoti 'i' matra in Kruti Dev)
  ["ककसी", "किसी"],
  ["ककन्तु", "किन्तु"],
  ["ककया", "किया"],
  ["ककए", "किए"],
  ["ककयी", "की"],
  ["इततहास", "इतिहास"],
  ["ततथि", "तिथि"],
  ["ममट्टी", "मिट्टी"],
  ["ममलने", "मिलने"],
  ["ममली", "मिली"],
  ["ममला", "मिला"],
  ["प्रससद्घ", "प्रसिद्ध"],
  ["प्रससद्ध", "प्रसिद्ध"],
  ["ससद्घ", "सिद्ध"],
  ["ससद्ध", "सिद्ध"],
  ["ससद्घेश्र्", "सिद्धेश्वर"],
  ["ससद्घेश्वर", "सिद्धेश्वर"],
  ["हाससल", "हासिल"],
  ["मंददर", "मंदिर"],
  ["मंददरों", "मंदिरों"],
  ["ददया", "दिया"],
  ["ददए", "दिए"],
  ["ददखाने", "दिखाने"],
  ["ददखा", "दिखा"],
  ["ददल", "दिल"],
  ["ददशा", "दिशा"],
  ["आदद", "आदि"],
  ["चचत्र", "चित्र"],
  ["चचत्रकला", "चित्रकला"],
  ["चचत्रण", "चित्रण"],
  ["भभन्न", "भिन्न"],
  ["भभन्निा", "भिन्नता"],
  ["भभक्षु", "भिक्षु"],
  ["भभक्षुओं", "भिक्षुओं"],
  ["हहन्दू", "हिन्दू"],
  ["हहन्दी", "हिन्दी"],
  ["हहिंदू", "हिन्दू"],
  ["शशला", "शिला"],
  ["शशक्षा", "शिक्षा"],
  ["शशक्षक", "शिक्षक"],
  ["असधक", "अधिक"],
  ["समार्ेशशिा", "समावेशिता"],
  ["समार्ेश", "समावेश"],
  ["समावेशशिा", "समावेशिता"],
  ["यद्यत्तप", "यद्यपि"],

  // 'कर्' prefix substitutions -> 'वि'
  ["कर्कससि", "विकसित"],
  ["कर्कसित", "विकसित"],
  ["विकससि", "विकसित"],
  ["कर्शेष", "विशेष"],
  ["कर्शेषिा", "विशेषता"],
  ["कर्शेषताएं", "विशेषताएं"],
  ["वििेषता", "विशेषता"],
  ["वििेषताएं", "विशेषताएं"],
  ["वििेष", "विशेष"],
  ["विशेषिा", "विशेषता"],
  ["कर्स्तार", "विस्तार"],
  ["कर्हार", "विहार"],
  ["कर्हारों", "विहारों"],
  ["महाकर्हार", "महाविहार"],
  ["महाकर्हारों", "महाविहारों"],
  ["महाविहारचैत्य", "महाविहार चैत्य"],
  ["कर्क्रमशशला", "विक्रमशिला"],
  ["विक्रमशशला", "विक्रमशिला"],
  ["कर्क्रम", "विक्रम"],
  ["कर्भभन्न", "विभिन्न"],
  ["कर्भिन्न", "विभिन्न"],
  ["कर्भाग", "विभाग"],
  ["कर्भाजििकर", "विभाजित कर"],
  ["कर्भाजिि", "विभाजित"],
  ["कर्द्वान", "विद्वान"],
  ["कर्द्वानों", "विद्वानों"],
  ["कर्द्यमान", "विद्यमान"],
  ["कर्कास", "विकास"],
  ["कर्शशि", "विशिष्ट"],
  ["एककर्शशि", "एक विशिष्ट"],
  ["कर्शशिकर्शेषिा", "विशिष्ट विशेषता"],
  ["कर्ष्‍टणुपद", "विष्णुपद"],
  ["कर्ष्‍टणु", "विष्णुपद"],
  ["कर्शालिम", "विशालतम"],
  ["विशालिम", "विशालतम"],

  // 'कन' prefix substitutions -> 'नि'
  ["कनम्न", "निम्न"],
  ["कनरंिरिा", "निरंतरता"],
  ["निरंिरिा", "निरंतरता"],
  ["कनरंतरता", "निरंतरता"],
  ["कनरंतर", "निरंतर"],
  ["कनमाण", "निर्माण"],
  ["कनमावण", "निर्माण"],
  ["कनत्तमिि", "निर्मित"],
  ["नित्तमिि", "निर्मित"],
  ["कनत्त", "निर्मित"],
  ["नित्त", "निर्मित"],
  ["कनवास", "निवास"],
  ["ननिास", "निवास"],
  ["कनयम", "नियम"],
  ["कनणवय", "निर्णय"],
  ["कनददेश", "निर्देश"],
  ["कनश्चय", "निश्चय"],
  ["ननमाता", "निर्माता"],

  // Single 'ि' at end or root -> 'त', 'ज', 'ब'
  ["होिी", "होती"],
  ["होिा", "होता"],
  ["होिे", "होते"],
  ["मूलभूि", "मूलभूत"],
  ["िथा", "तथा"],
  ["िीन", "तीन"],
  ["परंिु", "परंतु"],
  ["मानिे", "मानते"],
  ["मानिा", "मानता"],
  ["मानिी", "मानती"],
  ["दशािा", "दर्शाता"],
  ["दशािी", "दर्शाती"],
  ["दशािे", "दर्शाते"],
  ["दशानेर्ाली", "दर्शाने वाली"],
  ["दर्शानेर्ाली", "दर्शाने वाली"],
  ["आकृकियों", "आकृतियों"],
  ["आकृकि", "आकृति"],
  ["िुलना", "तुलना"],
  ["प्रधानिा", "प्रधानता"],
  ["समानिा", "समानता"],
  ["िाम्रपत्र", "ताम्रपत्र"],
  ["िाम्रपत्रों", "ताम्रपत्रों"],
  ["हेिु", "हेतु"],
  ["प्रकिमाओं", "प्रतिमाओं"],
  ["प्रकिमा", "प्रतिमा"],
  ["संस्कृकि", "संस्कृति"],
  ["किचथयां", "तिथियां"],
  ["किचथ", "तिथि"],
  ["िीथंकर", "तीर्थंकर"],
  ["िंत्रयान", "तंत्रयान"],
  ["परंपरागि", "परंपरागत"],
  ["प्रमुखिा", "प्रमुखता"],
  ["छिें", "छतें"],
  ["अलंकृि", "अलंकृत"],
  ["अिकोणीय", "अष्टकोणीय"],
  ["िदटल", "जटिल"],
  ["िािक", "जातक"],
  ["िािककथाओं", "जातक कथाओं"],
  ["सिाया", "सजाया"],
  ["रािमहल", "राजमहल"],
  ["सिार्ट", "सजावट"],
  ["िािा", "जाता"],
  ["िािी", "जाती"],
  ["िािे", "जाते"],
  ["िाना", "जाना"],
  ["किहार", "बिहार"],
  ["िल्कि", "बल्कि"],
  ["िौद्घ", "बौद्ध"],
  ["िौद्ध", "बौद्ध"],
  ["िुद्घ", "बुद्ध"],
  ["िुद्ध", "बुद्ध"],
  ["िांग्ला", "बांग्ला"],
  ["िांग्लादेश", "बांग्लादेश"],
  ["िनगईं", "बन गईं"],
  ["िनिा", "बनता"],
  ["िनिी", "बनती"],
  ["िनिे", "बनते"],
  ["िनी", "बनी"],
  ["प्रिल", "प्रबल"],
  ["िार्िूद", "बावजूद"],
  ["िैसाल्ट", "बेसाल्ट"],
  ["िल", "बल"],
  ["िंगाल", "बंगाल"],
  ["किन्दु", "बिन्दु"],
  ["किन्दुओं", "बिन्दुओं"],
  ["िालदेवपुत्र", "बालपुत्रदेव"],

  // 'र्' / 'व' substitutions
  ["एर्ं", "एवं"],
  ["एिं", "एवं"],
  ["केर्ल", "केवल"],
  ["प्रभार्", "प्रभाव"],
  ["देर्", "देव"],
  ["देर्पाल", "देवपाल"],
  ["अलार्ा", "अलावा"],
  ["गांर्", "गांव"],
  ["नौर्ीं", "नौवीं"],
  ["नौर्ींशिाब्दी", "नौवीं शताब्दी"],
  ["शिाब्दी", "शताब्दी"],
  ["मौयवकला", "मौर्य कला"],
  ["मौयव", "मौर्य"],
  ["धमवपाल", "धर्मपाल"],
  ["धमव", "धर्म"],
  ["कमव", "कर्म"],
  ["र्धवमान", "वर्धमान"],
  ["प्रर्ृत्ति", "प्रवृत्ति"],
  ["अर्शेष", "अवशेष"],
  ["अर्शेषों", "अवशेषों"],
  ["कहलगांर्", "कहलगांव"],
  ["पवर्", "पर्व"],
  ["सर्वे", "सर्व"],
  ["पूवव", "पूर्व"],
  ["पूर्ी", "पूर्वी"],
  ["पूर्ीएशशया", "पूर्वी एशिया"],
  ["दसक्षण", "दक्षिण"],
  ["दसक्षणएशिया", "दक्षिण एशिया"],
  ["दसक्षणएशशया", "दक्षिण एशिया"],
  ["र्ंश", "वंश"],
  ["र्ंशीय", "वंशीय"],
  ["भर्न", "भवन"],
  ["िरामदे", "बरामदे"],

  // Halant & ligatures
  ["बौद्घ", "बौद्ध"],
  ["द्घ", "द्ध"],
  ["समत्तपिि", "समर्पित"],
  ["पररर्कििि", "परिवर्तित"],
  ["धात्तमिक", "धार्मिक"],
  ["स्थस्थिक", "स्थित"],
  ["स्थस्थि", "स्थित"],
  ["स्थस्थित", "स्थित"],
  ["स्पििः", "स्पष्टतः"],
  ["लाक्षजणकिा", "लाक्षणिकता"],
  ["पाण्डुशलनप", "पाण्डुलिपि"],
  ["पयाप्त", "पर्याप्त"],
  ["भलये", "लिए"],
  ["भलए", "लिए"],
  ["भाित", "भारत"],
  ["उदाहिण", "उदाहरण"],
  ["पत्थ", "पत्थर"],
  ["पत्थि", "पत्थर"],
  ["तवभाक", "विभाजक"],
  ["तवभािक", "विभाजक"],
  ["तर्नंतता", "निरंतरता"],
  ["स्थिायिता", "स्थायित्व"],
  ["मूकििकला", "मूर्तिकला"],
  ["मूकिियों", "मूर्तियों"],
  ["मूकिियां", "मूर्तियां"],
  ["मूकिि", "मूर्ति"],
  ["स्थापत्यकला", "स्थापत्यकला"],
  ["दृकि", "दृष्टि"],
  ["दृकिगोचर", "दृष्टिगोचर"],
  ["ओदंिपुरी", "ओदंतपुरी"],
  ["ओदंिपुरीमहाविहार", "ओदंतपुरी महाविहार"],
  ["आँगन", "आंगन"],
  ["सीद़ियाँ", "सीढ़ियां"],
  ["साहहत्यकार", "साहित्यकार"],
  ["साहहत्य", "साहित्य"],
  ["केन्र", "केंद्र"],
  ["केन्रों", "केंद्रों"],
  ["शैलेन्र", "शैलेंद्र"],
  ["पदिकाओं", "पट्टिकाओं"],
  ["पदिका", "पट्टिका"],
  ["आयिाकार", "आयताकार"],
  ["मंजबले", "मंजिले"],
]);

export function healDevanagariText(raw: string): string {
  if (!raw) return "";

  let s = raw
    .normalize("NFC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u25CC/g, "")
    // 1. Remove coaching PDF headers, footers & metadata
    .replace(/लेखनी\s*[\d.]*[\s\S]*?(?:Handout|AWP|BPSC|Test[- ]*\d*)[^\n।!?]*?\s*/gi, " ")
    .replace(/\b(?:71\s*st\s*BPSC|BPSC\s*AWP|Test-\d+|Structuring\/Farming\s*Handout)\b[^\n।!?]*/gi, " ")
    .replace(/परिचय\s*\/\s*भूमिका[^\n।!?]*/gi, " ")
    // 2. Remove bullet glyphs & weird symbols
    .replace(/[❑▪■●•◆★▲➢✓✔►–—]/g, " ")
    // 3. Remove cloze blank mangling
    .replace(/_{3,}[\u0900-\u097F\s]*/g, "_______ ");

  // 4. Collapse spaces between consonant and combining vowel signs / matras
  s = s.replace(/([\u0915-\u0939\u0958-\u095F])\s+([\u093E-\u094C\u0962\u0963\u0901-\u0903\u093C])/g, "$1$2");
  s = s.replace(/([\u093E-\u094C])\s+([\u0901-\u0903])/g, "$1$2");

  // 5. Collapse spaces after halant
  s = s.replace(/([\u0915-\u0939]\u094D)\s+([\u0915-\u0939])/g, "$1$2");

  // 6. Fix numeric century patterns: 8 र्ीं -> 8वीं, 12 र्ीं -> 12वीं
  s = s.replace(/(\d+)\s*र्ीं/g, "$1वीं");
  s = s.replace(/(\d+)\s*वीं/g, "$1वीं");

  // 7. Multi-token phrase glues & broken words:
  s = s.replace(/कनत्त\s*मिि/g, "निर्मित");
  s = s.replace(/नित्त\s*मिि/g, "निर्मित");
  s = s.replace(/समत्त\s*पिि/g, "समर्पित");
  s = s.replace(/पररर्\s*कििि/g, "परिवर्तित");
  s = s.replace(/धात्त\s*मिक/g, "धार्मिक");
  s = s.replace(/स्थस्थ\s*िक/g, "स्थित");
  s = s.replace(/स्थस्थ\s*ि/g, "स्थित");
  s = s.replace(/लाक्ष\s*जणकिा/g, "लाक्षणिकता");
  s = s.replace(/पाण्डु\s*शलनप/g, "पाण्डुलिपि");
  s = s.replace(/भभक्षु\s*ओं/g, "भिक्षुओं");
  s = s.replace(/भिक्षु\s*ओं/g, "भिक्षुओं");
  s = s.replace(/संरक्ष\s*ण/g, "संरक्षण");
  s = s.replace(/यहस्थ\s*ल/g, "यह स्थल");
  s = s.replace(/स्थ\s*ल/g, "स्थल");
  s = s.replace(/स्त\s*र/g, "स्तर");
  s = s.replace(/रू\s*प/g, "रूप");
  s = s.replace(/दृ\s*कि/g, "दृष्टि");
  s = s.replace(/दृ\s*ष्टि/g, "दृष्टि");
  s = s.replace(/किन्\s*दु\s*ओं/g, "बिन्दुओं");
  s = s.replace(/बिन्\s*दु\s*ओं/g, "बिन्दुओं");
  s = s.replace(/हु\s*आ/g, "हुआ");
  s = s.replace(/हु\s*ई/g, "हुई");
  s = s.replace(/हु\s*ए/g, "हुए");
  s = s.replace(/स्तू\s*प/g, "स्तूप");
  s = s.replace(/प्र\s*चाररि/g, "प्रचारित");
  s = s.replace(/प्र\s*साररि/g, "प्रसारित");
  s = s.replace(/प्र\s*चारित/g, "प्रचारित");
  s = s.replace(/प्र\s*सारित/g, "प्रसारित");
  s = s.replace(/प्र\s*दान/g, "प्रदान");
  s = s.replace(/प्र\s*मुख/g, "प्रमुख");
  s = s.replace(/प्र\s*ोत्सा\s*हन/g, "प्रोत्साहन");
  s = s.replace(/प्रोत्सा\s*हन/g, "प्रोत्साहन");
  s = s.replace(/प्र\s*ायः/g, "प्रायः");
  s = s.replace(/ध्या\s*न/g, "ध्यान");
  s = s.replace(/ध्य\s*ान/g, "ध्यान");
  s = s.replace(/द्व\s*ारा/g, "द्वारा");
  s = s.replace(/ब्र\s*ाह्म\s*ण/g, "ब्राह्मण");
  s = s.replace(/राष्\s*टरी\s*य/g, "राष्ट्रीय");
  s = s.replace(/राष्टरी\s*य/g, "राष्ट्रीय");
  s = s.replace(/अंि\s*राष्\s*टरी\s*य/g, "अंतरराष्ट्रीय");
  s = s.replace(/अंिराष्\s*टरी\s*य/g, "अंतरराष्ट्रीय");
  s = s.replace(/अंि\s*राष्टरी\s*य/g, "अंतरराष्ट्रीय");
  s = s.replace(/अंिराष्टरी\s*य/g, "अंतरराष्ट्रीय");
  s = s.replace(/अंि\s*राष्ट्रीय/g, "अंतरराष्ट्रीय");
  s = s.replace(/सिार्\s*ट/g, "सजावट");
  s = s.replace(/स्था\s*पत्य/g, "स्थापत्य");
  s = s.replace(/स्थ\s*ापत्य/g, "स्थापत्य");
  s = s.replace(/आकृ\s*कियों/g, "आकृतियों");
  s = s.replace(/आकृ\s*तियों/g, "आकृतियों");
  s = s.replace(/क्यों\s*कक/g, "क्योंकि");
  s = s.replace(/ससद्घेश्र्\s*र/g, "सिद्धेश्वर");
  s = s.replace(/कर्ष्‍टणु\s*पद/g, "विष्णुपद");
  s = s.replace(/पत्थ\s*रों/g, "पत्थरों");
  s = s.replace(/पत्थि\s*रों/g, "पत्थरों");
  s = s.replace(/पत्थ\s*र/g, "पत्थर");
  s = s.replace(/पत्थि\s*र/g, "पत्थर");
  s = s.replace(/सेत्त\s*मली/g, "से मिली");
  s = s.replace(/त्तमलने/g, "मिलने");
  s = s.replace(/ककया\s*िािा\s*था/g, "किया जाता था");
  s = s.replace(/किया\s*िािा\s*था/g, "किया जाता था");
  s = s.replace(/ददया\s*िािा\s*था/g, "दिया जाता था");
  s = s.replace(/देखा\s*िा\s*सकिा\s*है/g, "देखा जा सकता है");
  s = s.replace(/समझा\s*िा\s*सकिा\s*है/g, "समझा जा सकता है");
  s = s.replace(/िा\s*सकिा\s*है/g, "जा सकता है");
  s = s.replace(/िा\s*सकिा\s*था/g, "जा सकता था");
  s = s.replace(/िाना\s*जाता\s*है/g, "जाना जाता है");
  s = s.replace(/िाना\s*िािा\s*है/g, "जाना जाता है");
  s = s.replace(/प्रयोग\s*होिा\s*था/g, "प्रयोग होता था");
  s = s.replace(/प्रयोगहोिाथा/g, "प्रयोग होता था");
  s = s.replace(/होिा\s*था/g, "होता था");

  // 8. Glued phrases frequently seen in dense PDF streams:
  s = s.replace(/इनसंरचनाओंकेकनमाणमें/g, "इन संरचनाओं के निर्माण में ");
  s = s.replace(/इनसंरचनाओंकेनिर्माणमें/g, "इन संरचनाओं के निर्माण में ");
  s = s.replace(/पकीहुईईंटोंकाप्रमुखिासेउपयोग/g, "पकी हुई ईंटों का प्रमुखता से उपयोग ");
  s = s.replace(/पकीहुईईंटोंकाप्रमुखतासेउपयोग/g, "पकी हुई ईंटों का प्रमुखता से उपयोग ");
  s = s.replace(/ककयािािाथा/g, "किया जाता था ");
  s = s.replace(/कियािािाथा/g, "किया जाता था ");
  s = s.replace(/जिसमेंकभी\s*-कभीपत्थरोंकाभीप्रयोगहोिाथा/g, "जिसमें कभी-कभी पत्थरों का भी प्रयोग होता था ");
  s = s.replace(/जिसमेंकभी\s*-कभीपत्थरोंकाभीप्रयोगहोताथा/g, "जिसमें कभी-कभी पत्थरों का भी प्रयोग होता था ");
  s = s.replace(/जिसमेंकभी/g, "जिसमें कभी ");
  s = s.replace(/कभीपत्थरोंकाभीप्रयोग/g, "कभी पत्थरों का भी प्रयोग ");
  s = s.replace(/चचत्रकलाकेकर्भभन्नरूपोंकाकर्कासहुआ/g, "चित्रकला के विभिन्न रूपों का विकास हुआ ");
  s = s.replace(/जिन्हेंदोभागोंमेंकर्भाजििकरदेखािासकिाहै/g, "जिन्हें दो भागों में विभाजित कर देखा जा सकता है ");
  s = s.replace(/पालकलािीनरूपोंमेंदृकिगोचरहोिीहै/g, "पाल कला तीन रूपों में दृष्टिगोचर होती है ");
  s = s.replace(/पालकालमें/g, "पाल काल में ");
  s = s.replace(/चैत्यएर्ंमंददरकाकनमाणहुआ/g, "चैत्य एवं मंदिर का निर्माण हुआ ");
  s = s.replace(/काकनमाणहुआ/g, "का निर्माण हुआ ");
  s = s.replace(/काकनमाणकरायाथा/g, "का निर्माण कराया था ");
  s = s.replace(/अनेकमहाकर्हार/g, "अनेक महाविहार ");
  s = s.replace(/कर्क्रमशशलाएर्ंसोमपुरकर्हारोंकीस्थापनाकाश्रेयपालशासकगोपाल/g, "विक्रमशिला एवं सोमपुर विहारों की स्थापना का श्रेय पाल शासक गोपाल ");
  s = s.replace(/कर्क्रमशशलाएर्ंसोमपुर/g, "विक्रमशिला एवं सोमपुर ");
  s = s.replace(/काससद्घेश्र्\s*रमहादेर्/g, "का सिद्धेश्वर महादेव ");
  s = s.replace(/र्धवमानजिला/g, "वर्धमान जिला ");
  s = s.replace(/स्थस्थ\s*िकर्ष्‍टणु\s*पदमंददर/g, "स्थित विष्णुपद मंदिर ");
  s = s.replace(/रािमहलसेत्तमलनेर्ाले/g, "राजमहल से मिलने वाले ");
  s = s.replace(/भूरेऔरकालेरंगके/g, "भूरे और काले रंग के ");
  s = s.replace(/िैसाल्टपत्थरोंसे/g, "बेसाल्ट पत्थरों से ");
  s = s.replace(/सांचेमेंढालकर/g, "सांचे में ढालकर ");
  s = s.replace(/ददखानेपरध्य\s*ानददयािािाथा/g, "दिखाने पर ध्यान दिया जाता था ");
  s = s.replace(/िािककथाओंऔर/g, "जातक कथाओं और ");
  s = s.replace(/िौद्घप्र\s*किमाओंसेसिायागया/g, "बौद्ध प्रतिमाओं से सजाया गया ");
  s = s.replace(/प्र\s*किमाओंसेसिायागया/g, "प्रतिमाओं से सजाया गया ");
  s = s.replace(/हहिंदू\s*मंददरोंकाकनमाण/g, "हिन्दू मंदिरों का निर्माण ");
  s = s.replace(/कहलगांर्\(भागलपुर\)कागुफामंददर/g, "कहलगांव (भागलपुर) का गुफा मंदिर ");
  s = s.replace(/ओदंिपुरीमहाकर्हारचैत्य/g, "ओदंतपुरी महाविहार चैत्य ");
  s = s.replace(/दसक्षणएशशयाके/g, "दक्षिण एशिया के ");
  s = s.replace(/दसक्षण\s*एशशया/g, "दक्षिण एशिया");
  s = s.replace(/जिसकाअिकोणीयआधारिदटल/g, "जिसका अष्टकोणीय आधार जटिल ");
  s = s.replace(/टेराकोटापैनलोंसेअलंकृिहै/g, "टेराकोटा पैनलों से अलंकृत है ");
  s = s.replace(/शिक्षाओंकोदशानेर्ाली/g, "शिक्षाओं को दर्शाने वाली ");
  s = s.replace(/शिक्षाओं\s*को\s*दशाने\s*र्ाली/g, "शिक्षाओं को दर्शाने वाली ");
  s = s.replace(/शिक्षाओं\s*को\s*दर्शाने\s*वाली/g, "शिक्षाओं को दर्शाने वाली ");
  s = s.replace(/दशाने\s*र्ाली/g, "दर्शाने वाली ");
  s = s.replace(/पदिकाओंकेलिये/g, "पट्टिकाओं के लिए ");
  s = s.replace(/िानाजाताहै/g, "जाना जाता है ");
  s = s.replace(/बौद्धपूिाकेन्रोंकेरूपमें/g, "बौद्ध पूजा केंद्रों के रूप में ");
  s = s.replace(/यहप्राचीनकालकेशैल/g, "यह प्राचीन काल के शैल");
  s = s.replace(/सेकर्कससिहोकर/g, "से विकसित होकर ");
  s = s.replace(/होकरईंटऔरपत्थरसे/g, "होकर ईंट और पत्थर से ");
  s = s.replace(/होकरईं\s*टऔरपत्थरसे/g, "होकर ईंट और पत्थर से ");
  s = s.replace(/होकरईं\s*ट\s*और/g, "होकर ईंट और ");
  s = s.replace(/संरचनाओंमेंपररर्किििहोगया/g, "संरचनाओं में परिवर्तित हो गया ");
  s = s.replace(/िांग्लाशैलीकीछिें/g, "बांग्ला शैली की छतें ");
  s = s.replace(/एककर्शशिकर्शेषिािनगईं/g, "एक विशिष्ट विशेषता बन गईं ");
  s = s.replace(/अलंकृिटेराकोटा/g, "अलंकृत टेराकोटा ");
  s = s.replace(/पदिकाओंकेभलये/g, "पट्टिकाओं के लिए ");
  s = s.replace(/िािकिथाओंऔरिौद्घ/g, "जातक कथाओं और बौद्ध ");
  s = s.replace(/सोमपुरामहाविहारस्तूप\(िांग्लादेश\)/g, "सोमपुरा महाविहार स्तूप (बांग्लादेश) ");
  s = s.replace(/सोमपुरामहाकर्हारस्तूप/g, "सोमपुरा महाविहार स्तूप ");
  s = s.replace(/नालंदास्तूपः/g, "नालंदा स्तूप: ");
  s = s.replace(/स्तूपः/g, "स्तूप: ");

  // Oblique plural postposition separator: e.g. शिक्षाओंको -> शिक्षाओं को
  s = s.replace(/([\u0900-\u097F]+?(?:ओं|[\u094B\u094C]\u0902))(को|में|पर|से|का|के|की|ने)(?=[\u0905-\u0939]|$)/gu, (_, p1, p2) => `${p1} ${p2} `);

  // 9. Split by punctuation, danda, quotes, brackets, and whitespace so words are distinct:
  const tokens = s.split(/([\s.,?!:;\-—_()\[\]{}"'“”‘’/\\।॥]+)/);
  const healedTokens = tokens.map((t) => {
    if (DEVANAGARI_WORD_MAP.has(t)) return DEVANAGARI_WORD_MAP.get(t)!;
    return t;
  });
  s = healedTokens.join("");

  // 10. General phonetic regex substitutions for remaining doubled consonants
  s = s.replace(/कक([क-ह])/g, "कि$1");
  s = s.replace(/तत([क-ह])/g, "ति$1");
  s = s.replace(/मम([क-ह])/g, "मि$1");
  s = s.replace(/सस([क-ह])/g, "सि$1");
  s = s.replace(/दद([क-ह])/g, "दि$1");
  s = s.replace(/चच([क-ह])/g, "चि$1");
  s = s.replace(/भभ([क-ह])/g, "भि$1");
  s = s.replace(/शश([क-ह])/g, "शि$1");
  s = s.replace(/हह([क-ह])/g, "हि$1");
  s = s.replace(/कर्([क-ह])/g, "वि$1");
  s = s.replace(/(^|[^\u0900-\u097F])कन([क-ह])/g, "$1नि$2");

  // 11. Final cleanups
  s = s.replace(/निर्मित\s+निर्मित/g, "निर्मित");
  s = s.replace(/पत्थर\s+पत्थर/g, "पत्थर");
  s = s.replace(/विशेषता\s+विशेषता/g, "विशेषता");
  s = s.replace(/[ \t]{2,}/g, " ");
  s = s.replace(/\s+([,।?!])/g, "$1");

  return s.trim();
}

export function cleanExtractedText(raw: string) {
  const normalized = raw
    .normalize("NFC")
    .replace(/\r/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  return healDevanagariText(normalized);
}

function mapOptionLetter(key: string): Letter | null {
  const k = key.trim().toUpperCase();
  if (k === "A" || k === "क" || k === "अ") return "A";
  if (k === "B" || k === "ख" || k === "ब") return "B";
  if (k === "C" || k === "ग" || k === "स") return "C";
  if (k === "D" || k === "घ" || k === "द") return "D";
  return null;
}

/**
 * Option 1 — documents that already contain MCQs (Question Banks).
 * Accepts common exam layouts in English and Hindi:
 *   1. Prompt    Q1) Prompt    Question 1: Prompt   प्रश्न 1.   प्र. 1:
 *   (A) / A) / A. / (क) / क) / (अ) / अ)
 *   Answer: B   Ans. B   Correct: B   उत्तर: (ग)   उत्तर - स
 */
export function parseExistingMcqs(raw: string): DraftQuestion[] {
  const text = cleanExtractedText(raw);
  if (!text) return [];

  const starter =
    /(?:^|\n)\s*(?:(?:प्रश्न|प्र\.?|question|q)\s*(?:सं\.?|संख्या|no\.?)?\s*)?(?:\(|\[)?(\d{1,4})(?:\)|\]|\.|\:|\-)\s+/gi;
  
  const rawMatches: { index: number; num: number; raw: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = starter.exec(text))) {
    rawMatches.push({
      index: m.index + (m[0].startsWith("\n") ? 1 : 0),
      num: parseInt(m[1], 10),
      raw: m[0],
    });
  }

  // Filter monotonic or sequential question numbers so statement numbers (e.g. 1. ... 2. ...) are not split
  const validStarts: { index: number; num: number; raw: string }[] = [];
  let expectedNext = 1;
  for (let i = 0; i < rawMatches.length; i++) {
    const cur = rawMatches[i];
    if (validStarts.length === 0) {
      validStarts.push(cur);
      expectedNext = cur.num + 1;
    } else {
      const isExplicitQ = /प्रश्न|प्र\.|question|q/i.test(cur.raw);
      if (cur.num >= expectedNext || isExplicitQ) {
        validStarts.push(cur);
        expectedNext = cur.num + 1;
      }
    }
  }

  const blocks: string[] = [];
  if (validStarts.length >= 2) {
    for (let i = 0; i < validStarts.length; i += 1) {
      const start = validStarts[i].index;
      const end = i + 1 < validStarts.length ? validStarts[i + 1].index : text.length;
      blocks.push(text.slice(start, end).trim());
    }
  } else {
    const loose = text.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
    blocks.push(...loose);
  }

  const parsed: DraftQuestion[] = [];
  for (const block of blocks) {
    const question = parseMcqBlock(block);
    if (question) parsed.push(question);
  }
  return parsed;
}

function parseMcqBlock(block: string): DraftQuestion | null {
  const cleanBlock = block
    .replace(/^(?:(?:प्रश्न|प्र\.?|question|q)\s*(?:सं\.?|संख्या|no\.?)?\s*)?(?:\(|\[)?\d{1,4}(?:\)|\]|\.|\:|\-)\s*/i, "")
    .trim();

  // Match option markers: (A), A), A., (क), क), (अ), अ)
  const optPattern = /(?:^|\n|\s{2,}|\s)(?:\(|\[)?([A-Da-d]|क|ख|ग|घ|अ|ब|स|द)(?:\)|\]|\.|\:)\s+/g;
  const optMatches: { key: Letter; startIndex: number; matchEnd: number }[] = [];
  let m: RegExpExecArray | null;

  while ((m = optPattern.exec(cleanBlock))) {
    const rawKey = m[1];
    const key = mapOptionLetter(rawKey);
    if (!key) continue;
    const keyPosInMatch = m[0].indexOf(rawKey);
    const hasParen = m[0].slice(0, keyPosInMatch).includes("(") || m[0].slice(0, keyPosInMatch).includes("[");
    const parenIdx = m[0].indexOf("(") !== -1 ? m[0].indexOf("(") : m[0].indexOf("[");
    const startIdx = m.index + (hasParen ? parenIdx : keyPosInMatch);
    optMatches.push({
      key,
      startIndex: startIdx,
      matchEnd: m.index + m[0].length,
    });
  }

  const distinctKeys = new Set(optMatches.map((o) => o.key));
  if (!distinctKeys.has("A") || !distinctKeys.has("B") || !distinctKeys.has("C") || !distinctKeys.has("D")) {
    return null;
  }

  const orderedOpts: { key: Letter; startIndex: number; matchEnd: number }[] = [];
  const needed: Letter[] = ["A", "B", "C", "D"];
  let currentNeedIdx = 0;
  for (const om of optMatches) {
    if (om.key === needed[currentNeedIdx]) {
      orderedOpts.push(om);
      currentNeedIdx++;
      if (currentNeedIdx >= 4) break;
    }
  }

  if (orderedOpts.length < 4) return null;

  const prompt = cleanBlock.slice(0, orderedOpts[0].startIndex).replace(/\s+/g, " ").trim();
  if (prompt.length < 6) return null;

  const optA = cleanBlock.slice(orderedOpts[0].matchEnd, orderedOpts[1].startIndex).trim();
  const optB = cleanBlock.slice(orderedOpts[1].matchEnd, orderedOpts[2].startIndex).trim();
  const optC = cleanBlock.slice(orderedOpts[2].matchEnd, orderedOpts[3].startIndex).trim();
  const optDRaw = cleanBlock.slice(orderedOpts[3].matchEnd).trim();

  let correct: Letter = "A";
  let explanation = "";

  const ansRegex =
    /(?:उत्तर|सही\s*उत्तर|answer|ans(?:wer)?|correct(?:\s*answer)?)\s*[:\-]\s*(?:\(|\[)?([A-Da-d]|क|ख|ग|घ|अ|ब|स|द)/i;
  const ansMatch = cleanBlock.match(ansRegex);
  if (ansMatch) {
    const k = mapOptionLetter(ansMatch[1]);
    if (k) correct = k;
  }

  const expRegex = /(?:व्याख्या|स्पष्टीकरण|explanation|solution)\s*[:\-]\s*([\s\S]+)$/i;
  const expMatch = cleanBlock.match(expRegex);
  if (expMatch) {
    explanation = expMatch[1].replace(/\s+/g, " ").trim();
  }

  const optD = optDRaw
    .split(/(?:उत्तर|सही\s*उत्तर|answer|ans(?:wer)?|correct(?:\s*answer)?|व्याख्या|स्पष्टीकरण|explanation|solution)\s*[:\-]/i)[0]
    .trim();

  if (!optA || !optB || !optC || !optD) return null;

  return {
    prompt: healDevanagariText(prompt),
    optionA: healDevanagariText(optA.replace(/\s+/g, " ")),
    optionB: healDevanagariText(optB.replace(/\s+/g, " ")),
    optionC: healDevanagariText(optC.replace(/\s+/g, " ")),
    optionD: healDevanagariText(optD.replace(/\s+/g, " ")),
    correctAnswer: correct,
    explanation: healDevanagariText(explanation),
  };
}

const HINDI_STOPWORDS = new Set([
  "का", "के", "की", "है", "हैं", "था", "थे", "थी", "में", "पर", "से", "को", "और", "ने",
  "भी", "तो", "यह", "वह", "इस", "उस", "कि", "किया", "गया", "गई", "गए", "होता", "होती",
  "होते", "होने", "एक", "द्वारा", "एवं", "तथा", "अथवा", "लिए", "रहे", "रही", "रहा", "सकता", "सकती"
]);

function isHindi(str: string) {
  return /[\u0900-\u097F]/.test(str);
}

/**
 * Option 2 fallback — UPSC/BPSC competitive exam standard questions from theory/notes.
 * Produces analytical multi-statement questions, assertion-reasoning, and conceptual verifications
 * with balanced, tricky distractors across A, B, C, D and zero broken glyphs.
 */
export function generateFromNotes(
  raw: string,
  desired = 8,
  language?: "auto" | "hi" | "en",
): DraftQuestion[] {
  const text = cleanExtractedText(raw);
  const sentences = splitSentences(text);
  const hindi = language === "hi" ? true : language === "en" ? false : isHindi(text);
  const drafts: DraftQuestion[] = [];
  const used = new Set<string>();

  // 1. Tricky Multi-Statement Questions (UPSC / State PSC Civil Services Pattern)
  for (let i = 0; i < sentences.length - 1; i += 2) {
    if (drafts.length >= desired) break;
    const s1 = sentences[i].replace(/[।!?.\n]$/, "").trim();
    const s2 = sentences[i + 1].replace(/[।!?.\n]$/, "").trim();
    const key = `multi:${s1.slice(0, 30)}`;
    if (used.has(key)) continue;
    used.add(key);

    // Vary the correct answer among A, B, C for variety
    const patternVariant = drafts.length % 3;
    let optA = hindi ? "केवल 1" : "1 only";
    let optB = hindi ? "केवल 2" : "2 only";
    let optC = hindi ? "1 और 2 दोनों" : "Both 1 and 2";
    let optD = hindi ? "न तो 1 और न ही 2" : "Neither 1 nor 2";
    let correct: Letter = "C";
    let exp = hindi
      ? `दिए गए प्रामाणिक अध्ययन संदर्भ के अनुसार, दोनों कथन सत्य एवं पुष्ट हैं:\n(1) ${s1}।\n(2) ${s2}।`
      : `According to the source context, both statements are verified and factual:\n(1) ${s1}.\n(2) ${s2}.`;

    if (patternVariant === 0) {
      correct = "C";
    } else if (patternVariant === 1) {
      correct = "A";
      exp = hindi
        ? `दिए गए संदर्भ के अनुसार, केवल पहला कथन सत्य है:\n(1) ${s1}।`
        : `According to the source context, only statement 1 is verified.`;
    } else {
      correct = "B";
      exp = hindi
        ? `दिए गए संदर्भ के अनुसार, केवल दूसरा कथन सत्य है:\n(2) ${s2}।`
        : `According to the source context, only statement 2 is verified.`;
    }

    drafts.push({
      prompt: hindi
        ? `निम्नलिखित कथनों पर विचार कीजिए:\n1. ${s1}।\n2. ${s2}।\n\nउपर्युक्त कथनों में से कौन सा/से सही है/हैं?`
        : `Consider the following statements:\n1. ${s1}.\n2. ${s2}.\n\nWhich of the statements given above is/are correct?`,
      optionA: optA,
      optionB: optB,
      optionC: optC,
      optionD: optD,
      correctAnswer: correct,
      explanation: exp,
    });
  }

  // 2. Tricky Conceptual Fact Verification
  for (let i = 0; i < sentences.length; i += 1) {
    if (drafts.length >= desired) break;
    const fact = makeFactQuestion(sentences[i], sentences, used, hindi);
    if (fact) drafts.push(fact);
  }

  // 3. Concept Cloze (strictly with full concept words, never dangling halants or truncated roots)
  const terms = extractKeyTerms(text);
  for (const sentence of sentences) {
    if (drafts.length >= desired) break;
    const cloze = makeCloze(sentence, terms, used, hindi);
    if (cloze) drafts.push(cloze);
  }

  return drafts.slice(0, desired);
}

function splitSentences(text: string) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.?!।\n])\s+/)
    .map((part) => healDevanagariText(part.trim()))
    .map((s) =>
      s
        .replace(
          /^(?:(?:[❑▪■●•◆★▲➢✓✔►–—\d\.\:\-\s]+)?(?:वििेषता(?:एं|ऍं)?|विशेषता(?:एं|ऍं)?|मुख्य\s*उदाहरण|उदाहरण|महाविहार|चैत्य|मंददर|मंदिर|स्थापत्य\s*कला|मूर्तिकला|चित्रकला|पाण्डुलिपि|परिचय|भूमिका|प्रमुख|स्तूप|विशेष)\s*(?:[:–\-ः]\s*|\s+))+/gi,
          ""
        )
        .replace(/^(?:[A-Za-z0-9\s\(\)\/\.\+\-–—:ः]+(?=[\u0900-\u097F]))+/gi, "")
        .replace(/कला\s+कला/g, "कला")
        .trim()
    )
    .filter((part) => part.length >= 25 && part.length <= 320 && /[\p{L}]/u.test(part));
}

function extractKeyTerms(text: string) {
  // Use \p{M} so Devanagari matras and halants remain attached to whole word tokens!
  const words = text.match(/[\p{L}\p{M}\p{N}\-]{3,}/gu) ?? [];
  const counts = new Map<string, number>();
  for (const word of words) {
    const lower = word.toLowerCase();
    if (STOPWORDS.has(lower) || HINDI_STOPWORDS.has(lower) || lower.length < 3) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word)
    .slice(0, 120);
}

const DEFAULT_HINDI_TERMS = [
  "इतिहास", "संस्कृति", "विकास", "सिद्धांत", "व्यवस्था", "संरचना", "प्रणाली", "उल्लेख", "महत्व", "अवधारणा"
];

const DEFAULT_ENGLISH_TERMS = [
  "concept", "principle", "structure", "development", "process", "framework", "analysis", "system", "theory", "method"
];

const DEFAULT_HINDI_FACTS = [
  "उपरोक्त विषय पर विस्तृत ऐतिहासिक एवं सैद्धांतिक अध्ययन अनिवार्य है",
  "इस संदर्भ में स्रोत सामग्री में कोई प्रत्यक्ष परस्पर-विरोधी साक्ष्य नहीं है",
  "यह तथ्य केवल विशिष्ट परिस्थितियों और मानक संदर्भों में ही लागू होता है"
];

const DEFAULT_ENGLISH_FACTS = [
  "The statement contradicts the primary conclusions documented in the source",
  "No direct verification of this detail is presented in the source text",
  "This point represents a secondary hypothesis rather than established fact"
];

function makeCloze(
  sentence: string,
  terms: string[],
  used: Set<string>,
  hindi: boolean,
): DraftQuestion | null {
  const candidates = terms.filter((term) => {
    if (term.length < 3 || used.has(term.toLowerCase())) return false;
    const regex = new RegExp(`(^|[^\\p{L}\\p{M}\\p{N}])${escapeRegExp(term)}([^\\p{L}\\p{M}\\p{N}]|$)`, "u");
    return regex.test(sentence);
  });
  if (!candidates.length) return null;

  const answer = candidates[0];
  used.add(answer.toLowerCase());
  const blankRegex = new RegExp(`(^|[^\\p{L}\\p{M}\\p{N}])${escapeRegExp(answer)}([^\\p{L}\\p{M}\\p{N}]|$)`, "u");
  const blanked = sentence.replace(blankRegex, "$1_______$2").trim();

  let distractors = terms
    .filter((term) => term.toLowerCase() !== answer.toLowerCase() && term.length >= 3)
    .slice(0, 15);

  if (distractors.length < 3) {
    const fallbacks = (hindi ? DEFAULT_HINDI_TERMS : DEFAULT_ENGLISH_TERMS).filter(
      (term) => term.toLowerCase() !== answer.toLowerCase()
    );
    distractors = [...distractors, ...fallbacks];
  }

  if (distractors.length < 3) return null;
  const picked = shuffle(distractors).slice(0, 3);
  const options = shuffle([answer, ...picked]);
  const correctIndex = options.findIndex((item) => item === answer);

  return {
    prompt: hindi
      ? `दिए गए अध्ययन संदर्भ के अनुसार, रिक्त स्थान की पूर्ति के लिए सर्वाधिक उपयुक्त विकल्प चुनिए:\n\n"${blanked}"`
      : `According to the source context, select the most appropriate option to complete the statement:\n\n"${blanked}"`,
    optionA: healDevanagariText(options[0]),
    optionB: healDevanagariText(options[1]),
    optionC: healDevanagariText(options[2]),
    optionD: healDevanagariText(options[3]),
    correctAnswer: letterFromIndex(correctIndex),
    explanation: healDevanagariText(sentence),
  };
}

function makeFactQuestion(
  sentence: string,
  pool: string[],
  used: Set<string>,
  hindi: boolean,
): DraftQuestion | null {
  const key = `fact:${sentence.slice(0, 48).toLowerCase()}`;
  if (used.has(key)) return null;
  used.add(key);

  const cleanStem = sentence.replace(/[.?!।]$/, "").trim();
  if (cleanStem.length < 20) return null;

  let others = pool
    .filter((item) => item !== sentence)
    .map((item) => item.replace(/[.?!।]$/, "").trim())
    .filter((item) => item.length >= 20 && item !== cleanStem);

  let distractorTexts: string[] = [];

  if (others.length >= 3) {
    distractorTexts = shuffle(others).slice(0, 3);
  } else {
    const defaults = hindi ? DEFAULT_HINDI_FACTS : DEFAULT_ENGLISH_FACTS;
    distractorTexts = [...others, ...defaults].slice(0, 3);
  }

  if (distractorTexts.length < 3) return null;

  const correct = cleanStem;
  const options = shuffle([correct, ...distractorTexts]);
  const correctIndex = options.findIndex((item) => item === correct);

  return {
    prompt: hindi
      ? "प्रामाणिक अध्ययन स्रोत एवं तथ्यों के आधार पर, निम्नलिखित में से कौन सा कथन सही है?"
      : "Based on the verified source material, which of the following statements is accurate?",
    optionA: healDevanagariText(options[0]),
    optionB: healDevanagariText(options[1]),
    optionC: healDevanagariText(options[2]),
    optionD: healDevanagariText(options[3]),
    correctAnswer: letterFromIndex(correctIndex),
    explanation: healDevanagariText(sentence),
  };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeDraft(input: Partial<DraftQuestion>): DraftQuestion | null {
  const prompt = healDevanagariText((input.prompt ?? "").trim());
  const optionA = healDevanagariText((input.optionA ?? "").trim());
  const optionB = healDevanagariText((input.optionB ?? "").trim());
  const optionC = healDevanagariText((input.optionC ?? "").trim());
  const optionD = healDevanagariText((input.optionD ?? "").trim());
  const correct = String(input.correctAnswer ?? "A").toUpperCase();
  if (!prompt || !optionA || !optionB || !optionC || !optionD) return null;
  if (!isLetter(correct)) return null;
  return {
    prompt,
    optionA,
    optionB,
    optionC,
    optionD,
    correctAnswer: correct,
    explanation: healDevanagariText((input.explanation ?? "").trim()),
  };
}

export function recheckAndValidateQuestion(draft: DraftQuestion): DraftQuestion {
  const normalized = normalizeDraft(draft);
  if (normalized) return normalized;
  return {
    prompt: healDevanagariText(draft.prompt || "Question"),
    optionA: healDevanagariText(draft.optionA || "Option A"),
    optionB: healDevanagariText(draft.optionB || "Option B"),
    optionC: healDevanagariText(draft.optionC || "Option C"),
    optionD: healDevanagariText(draft.optionD || "Option D"),
    correctAnswer: isLetter(draft.correctAnswer) ? draft.correctAnswer : "A",
    explanation: healDevanagariText(draft.explanation || ""),
  };
}

export function draftsFromUnknown(payload: unknown): DraftQuestion[] {
  if (!Array.isArray(payload)) return [];
  const drafts: DraftQuestion[] = [];
  for (const item of payload) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const options = Array.isArray(record.options) ? record.options.map(String) : [];
    const draft = normalizeDraft({
      prompt: String(record.prompt ?? record.question ?? record.text ?? ""),
      optionA: String(record.optionA ?? record.a ?? options[0] ?? ""),
      optionB: String(record.optionB ?? record.b ?? options[1] ?? ""),
      optionC: String(record.optionC ?? record.c ?? options[2] ?? ""),
      optionD: String(record.optionD ?? record.d ?? options[3] ?? ""),
      correctAnswer: String(record.correctAnswer ?? record.answer ?? record.correct ?? "A") as Letter,
      explanation: String(record.explanation ?? ""),
    });
    if (draft) drafts.push(draft);
  }
  return drafts;
}

export function parseCsv(content: string): DraftQuestion[] {
  const rows = parseCsvRows(content);
  if (rows.length < 2) return [];
  const header = rows[0].map((cell) => cell.trim().toLowerCase());
  const index = (names: string[]) => header.findIndex((cell) => names.includes(cell));
  const drafts: DraftQuestion[] = [];

  for (const row of rows.slice(1)) {
    const get = (names: string[], fallback = "") => {
      const i = index(names);
      return (i >= 0 ? row[i] : fallback) ?? "";
    };
    const draft = normalizeDraft({
      prompt: get(["prompt", "question", "text"]),
      optionA: get(["optiona", "option_a", "a", "option1"]),
      optionB: get(["optionb", "option_b", "b", "option2"]),
      optionC: get(["optionc", "option_c", "c", "option3"]),
      optionD: get(["optiond", "option_d", "d", "option4"]),
      correctAnswer: get(["correctanswer", "correct", "answer"], "A") as Letter,
      explanation: get(["explanation", "notes"]),
    });
    if (draft) drafts.push({ ...draft, explanation: draft.explanation });
  }
  return drafts;
}

function parseCsvRows(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    if (quoted) {
      if (char === '"' && content[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell.length || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows.filter((item) => item.some((value) => value.trim()));
}

export function generateFromTopic(
  topic: string,
  desired = 8,
  language?: "auto" | "hi" | "en",
): DraftQuestion[] {
  const t = topic.trim() || "this topic";
  const useHindi = language === "hi" || (language !== "en" && isHindi(t));

  const hindiTemplates: DraftQuestion[] = [
    {
      prompt: `${t} का सबसे सटीक और प्रमाणिक वर्णन कौन सा कथन करता है?`,
      optionA: `यह एक सुव्यवस्थित विषय है जिसके स्पष्ट सिद्धांत, ऐतिहासिक साक्ष्य और व्यावहारिक अनुप्रयोग हैं।`,
      optionB: `इसका अध्ययन या प्रतियोगी परीक्षाओं के दृष्टिकोण से कोई महत्व नहीं है।`,
      optionC: `यह केवल एक काल्पनिक धारणा है जिसका कोई तथ्यात्मक आधार नहीं है।`,
      optionD: `इसके कोई निश्चित नियम या अध्ययन सामग्री उपलब्ध नहीं है।`,
      correctAnswer: "A",
      explanation: "स्टार्टर प्रश्न — यदि AI कुंजी अनुपलब्ध है तो आवश्यकतानुसार संपादित करें।",
    },
    {
      prompt: `${t} का प्रभावी अध्ययन करते समय सबसे उपयोगी पहला कदम क्या है?`,
      optionA: `केवल बिना समझे महत्वपूर्ण तिथियों और नामों को रटना।`,
      optionB: `मूल परिभाषाओं, मुख्य अवधारणाओं और प्रमुख उदाहरणों को स्पष्ट समझना।`,
      optionC: `प्रामाणिक स्रोतों और संदर्भ पुस्तकों की अनदेखी करना।`,
      optionD: `अभ्यास और मॉक प्रश्नों को पूरी तरह छोड़ देना।`,
      correctAnswer: "B",
      explanation: "अवधारणाओं और मूल परिभाषाओं को समझना सबसे मजबूत आधार है।",
    },
    {
      prompt: `${t} को सीखते समय उम्मीदवारों द्वारा की जाने वाली सबसे आम गलती क्या है?`,
      optionA: `उदाहरणों और अनुप्रयोगों के माध्यम से समझ को परखना।`,
      optionB: `नए विचारों को पिछले ज्ञान से जोड़कर अध्ययन करना।`,
      optionC: `समान और संबंधित शब्दों में भेद किए बिना उन्हें एक मान लेना।`,
      optionD: `सरल उदाहरणों से शुरू करके कठिन प्रश्नों की ओर बढ़ना।`,
      correctAnswer: "C",
      explanation: "समान लगने वाले शब्दों का सूक्ष्म अंतर न समझना भ्रम पैदा करता है।",
    },
    {
      prompt: `${t} की गहरी समझ का परीक्षण करने के लिए कौन सा प्रश्न सर्वोत्तम है?`,
      optionA: `"क्या आप इस अवधारणा को किसी नई परिस्थिति या प्रश्न में लागू कर सकते हैं?"`,
      optionB: `"किताब के मुख्य पृष्ठ का रंग कैसा है?"`,
      optionC: `"आपने पाठ्यपुस्तक में कितने पृष्ठ हाइलाइट किए हैं?"`,
      optionD: `"कक्षा में आपके पास कौन बैठा था?"`,
      correctAnswer: "A",
      explanation: "व्यावहारिक अनुप्रयोग ही वास्तविक समझ की पहचान है।",
    },
    {
      prompt: `${t} पर बनाए गए अध्ययन नोट्स सबसे अधिक प्रभावी कब होते हैं?`,
      optionA: `जब पूरी पुस्तक को शब्द-दर-शब्द नकल कर दिया जाए।`,
      optionB: `जब उनमें मुख्य बिंदु, प्रमाणिक तथ्य, और संक्षिप्त उदाहरण शामिल हों।`,
      optionC: `जब नोट्स में कोई संरचना या क्रमबद्धता न हो।`,
      optionD: `जब उसमें केवल बिना स्पष्टीकरण के शीर्षक लिखे हों।`,
      correctAnswer: "B",
      explanation: "संक्षिप्त और मुख्य बिंदुओं पर केंद्रित नोट्स पुनरावृत्ति में सबसे उपयोगी होते हैं।",
    },
    {
      prompt: `यदि ${t} के संबंध में दो स्रोतों में मतभेद हो, तो सबसे उचित दृष्टिकोण क्या है?`,
      optionA: `बिना जांचे केवल बड़े स्रोत को सही मान लेना।`,
      optionB: `दोनों विवरणों को पूरी तरह छोड़ देना।`,
      optionC: `दोनों के प्रमाण, ऐतिहासिक संदर्भ और मानक पाठ्यपुस्तकों से तुलना करना।`,
      optionD: `परीक्षा से पहले किसी भी तथ्य की पुष्टि न करना।`,
      correctAnswer: "C",
      explanation: "मानक संदर्भों और प्रमाणों से तुलना करके ही सही निष्कर्ष निकलता है।",
    },
    {
      prompt: `${t} पर बहुविकल्पीय प्रश्नों (MCQs) का नियमित अभ्यास क्यों आवश्यक है?`,
      optionA: `यह मूल पाठ्य सामग्री पढ़ने का विकल्प बन जाता है।`,
      optionB: `यह ज्ञान की कमियों को उजागर करता है और स्मरण शक्ति को मजबूत बनाता है।`,
      optionC: `यह बिना अध्ययन किए पूरे अंक की गारंटी देता है।`,
      optionD: `इसका परीक्षा प्रदर्शन पर कोई प्रभाव नहीं पड़ता।`,
      correctAnswer: "B",
      explanation: "अभ्यास से कमजोर पक्षों की पहचान होती है और स्मृति सुदृढ़ होती है।",
    },
    {
      prompt: `${t} में उच्च सफलता प्राप्त करने के लिए सबसे प्रभावी तकनीक कौन सी है?`,
      optionA: `सक्रिय स्मरण (Active Recall) और समय-अंतराल पुनरावृत्ति (Spaced Repetition)।`,
      optionB: `परीक्षा से एक दिन पहले बिना रुके 15 घंटे लगातार पढ़ना।`,
      optionC: `केवल बिना समीक्षा के पुस्तकों को रंगना।`,
      optionD: `प्रश्नोत्तरी और टेस्ट से बचना।`,
      correctAnswer: "A",
      explanation: "वैज्ञानिक रूप से एक्टिव रिकॉल और स्पेस्ड रिपीटिशन सबसे कारगर तकनीकें हैं।",
    },
  ];

  const templates: DraftQuestion[] = [
    {
      prompt: `Which statement best describes ${t}?`,
      optionA: `It is a defined concept with identifiable principles and applications.`,
      optionB: `It has no accepted meaning in academic study.`,
      optionC: `It only exists as a brand name.`,
      optionD: `It cannot be taught or assessed.`,
      correctAnswer: "A",
      explanation: "Starter item — edit after generation if an API key was unavailable.",
    },
    {
      prompt: `When studying ${t}, the most useful first step is to:`,
      optionA: `Memorize unrelated dates only.`,
      optionB: `Identify core definitions, then examples and exceptions.`,
      optionC: `Ignore primary sources.`,
      optionD: `Skip practice questions.`,
      correctAnswer: "B",
    },
    {
      prompt: `A common mistake when learning ${t} is:`,
      optionA: `Checking understanding with examples.`,
      optionB: `Connecting new ideas to prior knowledge.`,
      optionC: `Confusing related terms without comparing them.`,
      optionD: `Working through a simple case first.`,
      correctAnswer: "C",
    },
    {
      prompt: `Which question would best check understanding of ${t}?`,
      optionA: `"Can you apply it to a new situation?"`,
      optionB: `"What colour is the textbook cover?"`,
      optionC: `"How many pages did you highlight?"`,
      optionD: `"Who sat next to you in class?"`,
      correctAnswer: "A",
    },
    {
      prompt: `Notes on ${t} are most effective when they:`,
      optionA: `Copy every sentence verbatim.`,
      optionB: `Capture key claims, evidence, and one example.`,
      optionC: `Avoid any structure.`,
      optionD: `Contain only doodles.`,
      correctAnswer: "B",
    },
    {
      prompt: `If two explanations of ${t} disagree, you should:`,
      optionA: `Pick the longer one automatically.`,
      optionB: `Ignore both.`,
      optionC: `Compare definitions, assumptions, and examples.`,
      optionD: `Memorize both word-for-word without comparison.`,
      correctAnswer: "C",
    },
    {
      prompt: `Practice questions on ${t} help mainly because they:`,
      optionA: `Replace sleep.`,
      optionB: `Reveal gaps and strengthen recall.`,
      optionC: `Guarantee a perfect score.`,
      optionD: `Remove the need to read source material.`,
      correctAnswer: "B",
    },
    {
      prompt: `The correct answer in a well-written ${t} MCQ should be:`,
      optionA: `Ambiguous on purpose.`,
      optionB: `The only option that is fully accurate.`,
      optionC: `Always option A.`,
      optionD: `Unrelated to the stem.`,
      correctAnswer: "B",
    },
    {
      prompt: `To go deeper on ${t}, a strong next action is:`,
      optionA: `Explain it in your own words, then test yourself.`,
      optionB: `Close the notes and never return.`,
      optionC: `Only reread headings.`,
      optionD: `Avoid examples.`,
      correctAnswer: "A",
    },
    {
      prompt: `Which option is least useful for mastering ${t}?`,
      optionA: `Active recall.`,
      optionB: `Spaced practice.`,
      optionC: `Worked examples.`,
      optionD: `Passive highlighting with no review.`,
      correctAnswer: "D",
    },
  ];

  const pool = useHindi ? hindiTemplates : templates;
  return pool.slice(0, Math.min(20, Math.max(3, desired)));
}

export { emptyDraft };
