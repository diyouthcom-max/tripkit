import type { AppLanguage } from '../../types';
import { pickLang, type LangMap8 } from '../langHelper';

export type PackingSeedItemKeyA =
  | 'doc_passport'
  | 'doc_qr_japan'
  | 'doc_qr_default'
  | 'doc_esim'
  | 'doc_cash_japan'
  | 'doc_cash_default'
  | 'doc_insurance'
  | 'doc_receipts'
  | 'top_tee_warm'
  | 'top_tee_cool'
  | 'top_midlayer'
  | 'top_rain_shell'
  | 'top_down_jacket'
  | 'top_thermal_base'
  | 'top_sun_shirt'
  | 'top_dress_warm'
  | 'top_dress_cool'
  | 'top_business_suit'
  | 'bot_trousers'
  | 'bot_underwear'
  | 'bot_socks'
  | 'bot_sleepwear'
  | 'bot_bra'
  | 'bot_shorts'
  | 'fw_sneakers'
  | 'fw_slippers'
  | 'fw_umbrella_rain'
  | 'fw_umbrella_clear'
  | 'fw_sunglasses'
  | 'fw_beanie_gloves'
  | 'fw_suncap'
  | 'fw_backup_shoes'
  | 'toi_toothbrush'
  | 'toi_wash_cabin'
  | 'toi_wash_checked'
  | 'toi_skin_sensitive'
  | 'toi_skin_default'
  | 'toi_lip_wipes'
  | 'toi_masks_mist'
  | 'toi_makeup'
  | 'toi_feminine'
  | 'toi_shaver'
  | 'toi_laundry'
  | 'elec_powerbank'
  | 'elec_adapter_multi'
  | 'elec_adapter_single'
  | 'elec_cables'
  | 'elec_earbuds'
  | 'elec_tracker';

const SEED_ITEMS_A: Record<PackingSeedItemKeyA, LangMap8<[string, string]>> = {
  doc_passport: {
    'zh-CN': ['护照 / 通行身份证件（有效期 > 6个月）', '值机、入境与免税退税核心证件，建议手机离线留存首页照片'],
    'en-US': ['Passport / Government ID (>6mo validity)', 'Required for check-in, border control & tax-free purchases'],
    'es-MX': ['Pasaporte / ID oficial (vigencia > 6 meses)', 'Necesario para abordar, migración y compras libres de impuestos'],
    'fr-FR': ['Passeport / pièce d’identité (validité > 6 mois)', 'Indispensable à l’embarquement, aux douanes et pour la détaxe'],
    'de-DE': ['Reisepass / Ausweis (> 6 Monate gültig)', 'Erforderlich für Check-in, Einreise und Tax-Free-Einkäufe'],
    'pt-BR': ['Passaporte / RG (validade > 6 meses)', 'Essencial para check-in, imigração e compras tax-free'],
    'ja-JP': ['パスポート・身分証明書（残存6ヶ月以上）', '搭乗・入国審査・免税手続きの必須書類（写真控え推奨）'],
  },
  doc_qr_japan: {
    'zh-CN': ['Visit Japan Web 入境与免税二维码截图', '0g 数字凭证，落地无网时可直接向海关出示截图快速通关'],
    'en-US': ['Visit Japan Web Immigration & Tax-Free QR (offline)', '0g digital pass — save offline screenshot for fast customs clearance'],
    'es-MX': ['QR de Visit Japan Web (migración y tax-free offline)', 'Pase digital 0 g: guarda captura sin conexión para agilizar aduana'],
    'fr-FR': ['QR Visit Japan Web (immigration & détaxe hors ligne)', 'Passe numérique 0 g : capture hors ligne pour passer la douane'],
    'de-DE': ['Visit Japan Web QR-Code (Einreise & Tax-Free offline)', '0g-Digitalpass — Offline-Screenshot für schnelle Zollkontrolle'],
    'pt-BR': ['QR Code Visit Japan Web (imigração e tax-free offline)', 'Passe digital 0 g: salve captura offline para agilizar a alfândega'],
    'ja-JP': ['Visit Japan Web 入国・税関QRコード（オフライン保存）', '0gのデジタル控え。到着直後にオフライン提示でスムーズ通過'],
  },
  doc_qr_default: {
    'zh-CN': ['电子登机牌与入境申报 QR 码', '0g 数字凭证，落地无网时可直接向海关出示截图快速通关'],
    'en-US': ['Digital boarding pass & arrival QR code', '0g digital pass — save offline screenshot for fast customs clearance'],
    'es-MX': ['Pase de abordar digital y QR de llegada', 'Pase digital 0 g: guarda captura sin conexión para pasar aduana'],
    'fr-FR': ['Carte d’embarquement et QR d’arrivée', 'Passe numérique 0 g : capture hors ligne pour la douane'],
    'de-DE': ['Digitale Bordkarte & Einreise-QR-Code', '0g-Digitalpass — Offline-Screenshot für schnelle Zollkontrolle'],
    'pt-BR': ['Cartão de embarque digital e QR de entrada', 'Passe digital 0 g: salve captura offline para a alfândega'],
    'ja-JP': ['モバイル搭乗券・入国申告QRコード', '0gのデジタル控え。機内モードでも提示できるよう保存'],
  },
  doc_esim: {
    'zh-CN': ['目的地流量 eSIM（提前激活二维码）', '航班落地滑行时即可秒连当地网络查 Google Maps 与交通乘换'],
    'en-US': ['Destination travel eSIM (0g digital profile)', 'Instant mobile data upon landing for maps and transit directions'],
    'es-MX': ['eSIM de datos para el destino (perfil digital 0 g)', 'Conexión inmediata al aterrizar para mapas y transporte'],
    'fr-FR': ['eSIM de données locales (profil numérique 0 g)', 'Connexion immédiate à l’atterrissage pour cartes et trajets'],
    'de-DE': ['Reise-eSIM fürs Zielland (0g-Digitalprofil)', 'Sofortiges Internet nach der Landung für Karten & ÖPNV'],
    'pt-BR': ['eSIM de dados do destino (perfil digital 0 g)', 'Internet imediata ao pousar para mapas e transporte'],
    'ja-JP': ['渡航先データeSIM（事前設定QR）', '着陸直後から現地回線で地図や乗換案内を利用可能'],
  },
  doc_cash_japan: {
    'zh-CN': ['免货币转换费芯片信用卡 ×2 + 当地小额现金/硬币包', '日本拉面机、神社御守与储物柜常用百元硬币及纸钞，配合 Suica/信用卡最稳妥'],
    'en-US': ['Zero-FX chip cards ×2 + local emergency cash / coin pouch', 'Handy for ramen machines, lockers & shrines alongside IC/credit cards'],
    'es-MX': ['2 tarjetas sin comisión FX + efectivo y monedero local', 'Útil para máquinas expendedoras, casilleros y templos junto con IC/tarjeta'],
    'fr-FR': ['2 cartes sans frais FX + espèces & porte-monnaie local', 'Pratique pour distributeurs, consignes et temples en complément des cartes'],
    'de-DE': ['2 Karten ohne Fremdwährungsgebühr + Bargeld & Münzbörse', 'Praktisch für Automaten, Schließfächer & Tempel neben IC-Karten'],
    'pt-BR': ['2 cartões sem taxa FX + dinheiro e porta-moedas local', 'Útil em máquinas, armários e templos junto com cartão/IC'],
    'ja-JP': ['外貨手数料無料カード×2＋少額現金・小銭入れ', '食券機やロッカー、寺社の賽銭用小銭＋交通系ICで万全'],
  },
  doc_cash_default: {
    'zh-CN': ['免货币转换费芯片信用卡 ×2 + 当地小额现金/硬币包', '支持当地地铁刷卡与免货币转换费消费'],
    'en-US': ['Zero-FX chip cards ×2 + local emergency cash / coin pouch', 'Zero-FX contactless card + cash coins for local kiosks and lockers'],
    'es-MX': ['2 tarjetas sin comisión FX + efectivo y monedas locales', 'Tarjetas contactless sin comisión + efectivo para kioscos locales'],
    'fr-FR': ['2 cartes sans frais FX + espèces & monnaie locale', 'Cartes sans contact sans frais + espèces pour bornes locales'],
    'de-DE': ['2 Karten ohne Fremdwährungsgebühr + Bargeld & Münzbörse', 'Kontaktlose Karten ohne Gebühr + Bargeld für Automaten'],
    'pt-BR': ['2 cartões sem taxa FX + dinheiro e moedas locais', 'Cartões por aproximação sem taxa + dinheiro para emergências'],
    'ja-JP': ['外貨手数料無料カード×2＋少額現金・小銭入れ', '現地の交通決済や券売機・コインロッカー用に必携'],
  },
  doc_insurance: {
    'zh-CN': ['旅行医疗与延误保险电子保单 (PDF)', '0g 离线备查保单号与 24 小时多语种救援电话'],
    'en-US': ['Travel medical & baggage insurance PDF', '0g offline policy PDF with 24/7 emergency assistance number'],
    'es-MX': ['Póliza PDF de seguro médico y equipaje', 'PDF sin conexión con número de asistencia 24/7'],
    'fr-FR': ['Attestation PDF d’assurance voyage & bagages', 'PDF hors ligne avec numéro d’urgence 24h/24'],
    'de-DE': ['Reisekranken- & Gepäckversicherung (PDF)', 'Offline-PDF mit Police-Nr. und 24/7-Notrufnummer'],
    'pt-BR': ['Apólice em PDF do seguro viagem e bagagem', 'PDF offline com número da apólice e assistência 24h'],
    'ja-JP': ['海外旅行保険証券PDF（医療・遅延補償）', '0g控え。24時間日本語サポート連絡先をオフライン保存'],
  },
  doc_receipts: {
    'zh-CN': ['防水退税单据与纸质票根收纳夹', '集中保管购物小票与免税单，离境机场海关核验不慌乱'],
    'en-US': ['Tax-free receipt organizer sleeve', 'Keeps shopping receipts crisp for airport customs validation'],
    'en-GB': ['Waterproof VAT refund receipt folder', 'Keeps shopping receipts crisp for airport customs validation'],
    'es-MX': ['Carpeta impermeable para recibos tax-free', 'Mantiene intactos tus recibos y facturas para aduana'],
    'fr-FR': ['Pochette étanche reçus & bordereaux détaxe', 'Garde les justificatifs impeccables pour le contrôle douanier'],
    'de-DE': ['Wasserfeste Hülle für Tax-Free-Belege', 'Hält Kassenbons und Ausfuhrscheine für den Zoll griffbereit'],
    'pt-BR': ['Pasta impermeável para notas tax-free', 'Mantém recibos organizados para validação na alfândega'],
    'ja-JP': ['防水レシート・免税書類ホルダー', 'レシートやチケット半券をまとめて出国手続きもスムーズ'],
  },
  top_tee_warm: {
    'zh-CN': ['透气速干短袖 / 纯棉 T 恤', '按洗护周期配置'],
    'en-US': ['Breathable tees / short-sleeve tops', 'Scaled for wash cycle'],
    'es-MX': ['Playeras transpirables de manga corta', 'Calculado según ciclo de lavado'],
    'fr-FR': ['T-shirts respirants à manches courtes', 'Adapté au cycle de lessive'],
    'de-DE': ['Atmungsaktive Kurzarm-T-Shirts', 'Auf den Waschzyklus abgestimmt'],
    'pt-BR': ['Camisetas respiráveis de manga curta', 'Calculado pelo ciclo de lavagem'],
    'ja-JP': ['通気性・速乾半袖Tシャツ', '洗濯サイクルに合わせた枚数'],
  },
  top_tee_cool: {
    'zh-CN': ['亲肤透气长袖打底衫 / T 恤', '按洗护周期配置'],
    'en-US': ['Breathable base tops / tees', 'Scaled for wash cycle'],
    'es-MX': ['Camisetas base de manga larga / tees', 'Calculado según ciclo de lavado'],
    'fr-FR': ['Hauts de base / T-shirts respirants', 'Adapté au cycle de lessive'],
    'de-DE': ['Atmungsaktive Langarm-Shirts / Tops', 'Auf den Waschzyklus abgestimmt'],
    'pt-BR': ['Camisetas base / manga longa respirável', 'Calculado pelo ciclo de lavagem'],
    'ja-JP': ['肌触りの良い長袖カットソー・Tシャツ', '洗濯サイクルに合わせた枚数'],
  },
  top_midlayer: {
    'zh-CN': ['抓绒开衫 / 美利奴羊毛针织中层', '应对早晚与低温站点洋葱式叠穿'],
    'en-US': ['Fleece zip-up or merino knit mid-layer', 'Essential mid-layer for cool mornings & chilly stops'],
    'es-MX': ['Sudadera polar o suéter ligero de merino', 'Capa media clave para mañanas frescas y cambios de clima'],
    'fr-FR': ['Gilet polaire ou pull fin en mérinos', 'Couche intermédiaire essentielle pour matins frais'],
    'de-DE': ['Fleecejacke oder Merino-Strickpullover', 'Wichtige Zwischenschicht für kühle Morgenstunden'],
    'pt-BR': ['Jaqueta fleece ou tricô de lã merino', 'Camada média essencial para manhãs frescas'],
    'ja-JP': ['フリースジャケット・メリノウールニット', '朝晩の冷え込みに重宝する重ね着用ミドルレイヤー'],
  },
  top_rain_shell: {
    'zh-CN': ['防风防泼水硬壳冲锋衣 / 连帽风衣', '多站阴雨或海风微气候刚需，建议登机时直接穿在身上省箱内空间'],
    'en-US': ['Waterproof breathable rain shell jacket', 'Blocks wind and rain showers; wear on flight to save bag weight'],
    'es-MX': ['Chamarra impermeable cortaviento', 'Protege de lluvia y viento; úsala en el vuelo para ahorrar espacio'],
    'fr-FR': ['Veste imperméable coupe-vent respirante', 'Protège du vent et des averses ; portez-la en vol pour gagner de la place'],
    'de-DE': ['Wasserdichte, atmungsaktive Hardshell-Jacke', 'Schützt vor Wind & Regen; im Flug tragen spart Gepäckgewicht'],
    'pt-BR': ['Jaqueta corta-vento impermeável', 'Protege contra chuva e vento; vista no voo para poupar espaço'],
    'ja-JP': ['防水・防風シェルジャケット（マウンテンパーカー）', '急な雨や強風対策に。機内着用でスーツケースを省スペース化'],
  },
  top_down_jacket: {
    'zh-CN': ['轻便高蓬松便携羽绒服', '途经低温站点核心锁温层，可收纳成小袋'],
    'en-US': ['Packable ultralight down jacket', 'High warmth-to-weight insulation for cold stops'],
    'es-MX': ['Chamarra de pluma ultraligera plegable', 'Máximo abrigo con peso mínimo para paradas frías'],
    'fr-FR': ['Doudoune ultralégère compressible', 'Chaleur optimale pour un poids plume par temps froid'],
    'de-DE': ['Leichte, verpackbare Daunenjacke', 'Hohe Wärmeleistung bei minimalem Gewicht'],
    'pt-BR': ['Jaqueta puffer de pluma ultraleve dobrável', 'Alto aquecimento com peso mínimo para paradas frias'],
    'ja-JP': ['ポケッタブル軽量ダウンジャケット', '寒冷地での主力防寒。付属袋にコンパクト収納可能'],
  },
  top_thermal_base: {
    'zh-CN': ['发热保暖内衣套装（打底衫+秋裤）', '寒冷日贴身打底，大幅减少外层臃肿感'],
    'en-US': ['Thermal base layer set (top & bottom)', 'Lightweight thermal base under trousers and coats on cold days'],
    'es-MX': ['Conjunto térmico interior (playera y malla)', 'Calor ligero bajo el pantalón en días muy fríos'],
    'fr-FR': ['Ensemble sous-vêtements thermiques (haut & bas)', 'Chaleur légère sous les vêtements par temps froid'],
    'de-DE': ['Thermounterwäsche-Set (Oberteil & Hose)', 'Leichte Wärmebasis unter Hose und Jacke an kalten Tagen'],
    'pt-BR': ['Conjunto segunda pele térmica (blusa e calça)', 'Aquecimento leve sob a roupa em dias frios'],
    'ja-JP': ['保温インナー上下セット（ヒートテック等）', '寒い日の重ね着を薄くスマートに保つベースレイヤー'],
  },
  top_sun_shirt: {
    'zh-CN': ['UPF50+ 防晒薄衬衫 / 空调房冰丝罩衫', '日间海风与户外强紫外线防晒，同时应对商场与机舱强劲冷气'],
    'en-US': ['UPF50+ sun shirt / light indoor A/C layer', 'Protects from UV outdoors and chilly cabin/mall air conditioning'],
    'es-MX': ['Camisa ligera UPF50+ / capa para aire acondicionado', 'Protege del sol afuera y del aire acondicionado fuerte adentro'],
    'fr-FR': ['Surchemise légère UPF50+ / couche clim', 'Protège des UV dehors et de la climatisation en intérieur'],
    'de-DE': ['UPF50+ Sonnenschutzhemd / leichte Strickjacke', 'Schützt vor UV-Strahlung draußen und starker Klimaanlage'],
    'pt-BR': ['Camisa leve UV50+ / casaquinho para ar-condicionado', 'Protege do sol na rua e do ar-condicionado forte em voos e lojas'],
    'ja-JP': ['UVカット薄手シャツ・冷房対策カーディガン', '日中の紫外線対策と機内・館内の強い冷房対策に'],
  },
  top_dress_warm: {
    'zh-CN': ['拍照出片连衣裙 / 度假半身裙', '兼顾街拍出片与晚餐仪式感，轻便易收纳'],
    'en-US': ['Day-to-dinner travel dress / midi skirt', 'Versatile outfit for sightseeing photos and nice dinners'],
    'es-MX': ['Vestido de viaje o falda midi', 'Atuendo versátil para fotos de día y cenas especiales'],
    'fr-FR': ['Robe de voyage / jupe midi polyvalente', 'Tenue élégante de la visite au dîner au restaurant'],
    'de-DE': ['Reisekleid / Midirock für Tag & Abend', 'Vielseitig für Stadtbummel, Fotos und schicke Abendessen'],
    'pt-BR': ['Vestido versátil / saia midi de viagem', 'Combina passeios fotogênicos durante o dia e jantares'],
    'ja-JP': ['写真映えワンピース・リゾートスカート', '街歩き写真からディナーまで使える軽量お出かけ着'],
  },
  top_dress_cool: {
    'zh-CN': ['高腰针织连衣裙 / 叠穿马甲', '兼顾街拍出片与晚餐仪式感，轻便易收纳'],
    'en-US': ['Knit sweater dress / layering vest', 'Versatile outfit for sightseeing photos and nice dinners'],
    'es-MX': ['Vestido de punto o chaleco para capas', 'Look cálido y fotogénico para paseos y cenas'],
    'fr-FR': ['Robe-pull en maille / gilet sans manches', 'Look chaud et élégant pour visites et restaurants'],
    'de-DE': ['Strickkleid / Lagenlook-Weste', 'Wärmend und stilvoll für Sightseeing und Abendessen'],
    'pt-BR': ['Vestido de tricô / colete para sobreposição', 'Visual elegante e quentinho para passeios e jantares'],
    'ja-JP': ['ニットワンピース・重ね着用ベスト', '暖かさと写真映えを両立する上品スタイル'],
  },
  top_business_suit: {
    'zh-CN': ['免烫抗皱商务衬衫 + 轻便西装外套', '商务会面与正式场合即穿免熨烫'],
    'en-US': ['Wrinkle-free dress shirt & travel blazer', 'Sharp wrinkle-resistant attire for meetings and business dinners'],
    'es-MX': ['Camisa sin arrugas y saco de viaje', 'Presentación impecable sin planchar para juntas y cenas'],
    'fr-FR': ['Chemise infroissable & blazer de voyage', 'Tenue impeccable sans repassage pour réunions et dîners'],
    'de-DE': ['Knitterfreies Business-Hemd & Reiseblazer', 'Gepflegter Auftritt ohne Bügeln bei Meetings & Dinners'],
    'pt-BR': ['Camisa que não amassa e blazer de viagem', 'Visual alinhado sem precisar passar para reuniões'],
    'ja-JP': ['防シワドレスシャツ＋軽量トラベルジャケット', '出張の商談やディナーにすぐ着られるノーアイロン仕様'],
  },
  bot_trousers: {
    'zh-CN': ['高弹舒适步行长裤 / 牛仔裤', '耐脏百搭可跨日混搭，适合日均万步与城际乘车'],
    'en-US': ['Stretch travel trousers / jeans', 'Versatile multi-wear bottoms comfortable for transit & walking'],
    'es-MX': ['Pantalón elástico de viaje / jeans', 'Cómodo para caminar mucho y fácil de combinar varios días'],
    'fr-FR': ['Pantalon stretch de voyage / jean', 'Confortable pour marcher et polyvalent sur plusieurs jours'],
    'de-DE': ['Elastische Reisehose / Jeans', 'Bequem für lange Fußmärsche und mehrfach kombinierbar'],
    'pt-BR': ['Calça elástica confortável / jeans', 'Versátil para caminhar bastante e repetir com vários looks'],
    'ja-JP': ['ストレッチ歩行パンツ・ジーンズ', '長時間の移動や1日1万歩の街歩きでも疲れにくいボトムス'],
  },
  bot_underwear: {
    'zh-CN': ['透气速干内裤', '贴身每日一换，洗后一晚速干'],
    'en-US': ['Quick-dry travel underwear', 'Fresh pair daily; quick-dry fabric dries overnight after washing'],
    'es-MX': ['Ropa interior transpirable de secado rápido', 'Cambio diario; tela ligera que seca en una noche'],
    'fr-FR': ['Sous-vêtements respirants à séchage rapide', 'Change quotidien ; sèche en une nuit après lavage'],
    'de-DE': ['Schnelltrocknende Reise-Unterwäsche', 'Täglich frisch; trocknet nach Handwäsche über Nacht'],
    'pt-BR': ['Roupas íntimas respiráveis dry-fit', 'Troca diária; seca durante a noite após lavar'],
    'ja-JP': ['通気性・速乾トラベル下着', '毎日交換。手洗いしても一晩で乾く軽量素材'],
  },
  bot_socks: {
    'zh-CN': ['缓震防臭运动袜 / 美利奴羊毛袜', '长时间暴走吸汗防起泡'],
    'en-US': ['Cushioned merino / walking socks', 'Blister-preventing cushioned socks for high-step-count days'],
    'es-MX': ['Calcetines acolchados de merino / caminata', 'Evitan ampollas y absorben humedad en jornadas largas'],
    'fr-FR': ['Chaussettes coussinées mérinos / marche', 'Préviennent les ampoules lors des longues journées à pied'],
    'de-DE': ['Gepolsterte Merino- / Wandersocken', 'Verhindern Blasen an Tagen mit vielen Schritten'],
    'pt-BR': ['Meias acolchoadas de merino / caminhada', 'Evitam bolhas em dias com longas caminhadas'],
    'ja-JP': ['クッション性メリノ・ウォーキングソックス', '長距離歩行のムレや靴擦れ・マメを防止'],
  },
  bot_sleepwear: {
    'zh-CN': ['轻便亲肤睡衣 / 家居服套装', '酒店睡眠舒适卫生'],
    'en-US': ['Lightweight sleepwear / lounge set', 'Comfortable hotel sleepwear set'],
    'es-MX': ['Pijama ligero / conjunto de descanso', 'Comodidad e higiene para dormir en el hotel'],
    'fr-FR': ['Pyjama léger / tenue d’intérieur', 'Confort et hygiène pour bien dormir à l’hôtel'],
    'de-DE': ['Leichte Schlafanzug- / Loungewear-Garnitur', 'Bequeme Nachtwäsche fürs Hotel'],
    'pt-BR': ['Pijama leve / roupa de descanso', 'Conforto e higiene para noites no hotel'],
    'ja-JP': ['軽量パジャマ・ルームウェア上下', 'ホテルでの安眠とリラックスタイムに'],
  },
  bot_bra: {
    'zh-CN': ['无痕内衣 / 舒适运动文胸', '长途飞行与全天步行零勒痕'],
    'en-US': ['Seamless bras / comfort bralettes', 'All-day comfort for flights and walking days'],
    'es-MX': ['Brasieres sin costuras / bralettes cómodos', 'Comodidad total en vuelos largos y días de caminata'],
    'fr-FR': ['Soutiens-gorge sans coutures / brassières', 'Confort sans pression en vol et pendant les visites'],
    'de-DE': ['Nahtlose BHs / bequeme Bralettes', 'Hoher Tragekomfort für Flüge und lange Stadtspaziergänge'],
    'pt-BR': ['Sutiãs sem costura / tops confortáveis', 'Conforto o dia inteiro em voos e caminhadas'],
    'ja-JP': ['ノンワイヤー・シームレスブラ', '長時間フライトや終日の街歩きでも締め付け感ゼロ'],
  },
  bot_shorts: {
    'zh-CN': ['透气休闲短裤 / 亚麻阔腿凉感裤', '温暖或海滨站点清爽透气不闷汗'],
    'en-US': ['Breathable shorts / airy linen pants', 'Cool comfort for warm & coastal stops'],
    'es-MX': ['Shorts transpirables / pantalón de lino', 'Frescura ideal para paradas cálidas o costeras'],
    'fr-FR': ['Shorts respirants / pantalon en lin léger', 'Fraîcheur idéale pour les étapes chaudes ou côtières'],
    'de-DE': ['Luftige Shorts / leichte Leinenhose', 'Angenehm kühl an warmen Tagen und am Meer'],
    'pt-BR': ['Shorts respiráveis / calça leve de linho', 'Frescor garantido em paradas quentes e litorâneas'],
    'ja-JP': ['通気性ショートパンツ・リネンパンツ', '暑い日や海辺エリアでも蒸れずに涼しいボトムス'],
  },
  fw_sneakers: {
    'zh-CN': ['主力缓震防水步行鞋（出发直接穿脚上）', '最重鞋靴建议穿在脚上登机，节省行李额与箱内空间'],
    'en-US': ['Broken-in cushioned walking sneakers (wear on flight)', 'Wear heaviest broken-in walking shoes on plane to save bag weight'],
    'en-GB': ['Broken-in cushioned walking trainers (wear on flight)', 'Wear heaviest broken-in walking shoes on plane to save bag weight'],
    'es-MX': ['Tenis cómodos y probados (puestos en el vuelo)', 'Usa el calzado más pesado al volar para ahorrar espacio y peso'],
    'fr-FR': ['Baskets de marche déjà rodées (portées en vol)', 'Portez les chaussures les plus lourdes en avion pour alléger la valise'],
    'de-DE': ['Eingelaufene, bequeme Sneaker (im Flug tragen)', 'Schwerste Schuhe auf dem Flug anziehen spart Platz und Gewicht'],
    'pt-BR': ['Tênis confortável já amaciado (usar no voo)', 'Vá com o calçado mais pesado no voo para economizar espaço e peso'],
    'ja-JP': ['履き慣れたクッション歩行スニーカー（搭乗時着用）', '一番重くかさばる靴は履いて搭乗し荷物重量を節約'],
  },
  fw_slippers: {
    'zh-CN': ['超轻折叠酒店拖鞋 / 浴室防滑凉拖', '洗浴与房间放松必备，海滩或飞机长途亦能换穿放松双脚'],
    'en-US': ['Ultralight packable hotel slippers', 'Essential for hotel showers, beach walks & long-haul flights'],
    'es-MX': ['Pantuflas o sandalias plegables de hotel', 'Útiles para la ducha, descansar en la habitación o en vuelos largos'],
    'fr-FR': ['Chaussons / claquettes pliables ultralégers', 'Indispensables pour l’hôtel, la douche et les vols long-courriers'],
    'de-DE': ['Ultraleichte faltbare Hotel-Slipper', 'Praktisch für Hotelzimmer, Dusche und Langstreckenflüge'],
    'pt-BR': ['Chinelos ultraleves dobráveis para hotel', 'Essenciais para o quarto, banho, praia e voos longos'],
    'ja-JP': ['超軽量折りたたみスリッパ・ビーチサンダル', '客室・シャワー・長時間フライトで足を解放'],
  },
  fw_umbrella_rain: {
    'zh-CN': ['抗风折叠晴雨两用伞', '预报含降雨日，随身侧袋快取防淋湿'],
    'en-US': ['Compact windproof UV/rain umbrella', 'Rain forecast on route — keep in daypack side pocket'],
    'es-MX': ['Paraguas compacto antiviento UV/lluvia', 'Se pronostica lluvia en la ruta: llévalo a la mano'],
    'fr-FR': ['Parapluie compact coupe-vent UV/pluie', 'Pluie prévue sur le trajet : gardez-le à portée de main'],
    'de-DE': ['Kompakter sturmfester UV-/Regenschirm', 'Regen auf der Route erwartet — im Tagesrucksack griffbereit halten'],
    'pt-BR': ['Guarda-chuva compacto corta-vento UV', 'Previsão de chuva no roteiro — mantenha no bolso lateral'],
    'ja-JP': ['耐風折りたたみ晴雨兼用傘', '雨予報の日あり。すぐ出せるバッグ外ポケットに常備'],
  },
  fw_umbrella_clear: {
    'zh-CN': ['抗风折叠晴雨两用伞', '晴雨两用遮阳防突发阵雨'],
    'en-US': ['Compact windproof UV/rain umbrella', 'Compact sun & sudden shower protection'],
    'es-MX': ['Paraguas compacto antiviento UV/lluvia', 'Protección contra sol intenso y lluvias repentinas'],
    'fr-FR': ['Parapluie compact coupe-vent UV/pluie', 'Protection soleil et averses imprévues'],
    'de-DE': ['Kompakter sturmfester UV-/Regenschirm', 'Kompakter Schutz vor Sonne und plötzlichen Schauern'],
    'pt-BR': ['Guarda-chuva compacto corta-vento UV', 'Proteção compacta contra sol forte e chuvas rápidas'],
    'ja-JP': ['耐風折りたたみ晴雨兼用傘', '日傘としても急な通り雨対策としても重宝'],
  },
  fw_sunglasses: {
    'zh-CN': ['UV400 偏光太阳镜（附便携镜布）', '户外强光、水面反光与街拍防眩光'],
    'en-US': ['UV400 polarized sunglasses', 'Eye comfort for bright days, coastal water glare, and driving'],
    'es-MX': ['Lentes de sol polarizados UV400', 'Descanso visual ante sol fuerte, reflejo en agua y carretera'],
    'fr-FR': ['Lunettes de soleil polarisées UV400', 'Confort visuel par grand soleil, sur l’eau ou au volant'],
    'de-DE': ['Polarisierte Sonnenbrille UV400', 'Augenschutz bei hellem Licht, Wasserreflexionen und Fahrten'],
    'pt-BR': ['Óculos de sol polarizados UV400', 'Conforto visual sob sol forte, reflexo na água e direção'],
    'ja-JP': ['UV400偏光サングラス（メガネ拭き付）', '強い日差しや水面・雪面の照り返しから目を保護'],
  },
  fw_beanie_gloves: {
    'zh-CN': ['保暖针织冷帽 + 触屏防风手套', '低温大风站点防头部与手指失温'],
    'en-US': ['Warm knit beanie & touchscreen gloves', 'Prevents heat loss on cold windy viewpoints'],
    'es-MX': ['Gorro tejido y guantes táctiles cortaviento', 'Evita pérdida de calor en miradores fríos y con viento'],
    'fr-FR': ['Bonnet chaud & gants tactiles coupe-vent', 'Protège tête et doigts sur les points de vue venteux'],
    'de-DE': ['Warme Strickmütze & Touchscreen-Handschuhe', 'Schützt vor Auskühlung an kalten, windigen Aussichtspunkten'],
    'pt-BR': ['Gorro térmico de tricô e luvas touch', 'Evita perda de calor em mirantes frios e com vento'],
    'ja-JP': ['ニット帽＋スマホ対応防風手袋', '寒冷地や風の強い展望スポットでの末端冷え防止'],
  },
  fw_suncap: {
    'zh-CN': ['可折叠遮阳棒球帽 / 渔夫帽', '物理遮阳防晒且免打理发型'],
    'en-US': ['Packable sun cap / bucket hat', 'Packable sun protection on walking days'],
    'es-MX': ['Gorra o sombrero plegable contra el sol', 'Protección solar práctica durante caminatas'],
    'fr-FR': ['Casquette ou bob pliable anti-UV', 'Protection solaire légère pendant les balades'],
    'de-DE': ['Faltbare Sonnenkappe / Fischerhut', 'Praktischer Sonnenschutz auf langen Spaziergängen'],
    'pt-BR': ['Boné ou chapéu bucket dobrável', 'Proteção solar leve em dias de caminhada'],
    'ja-JP': ['折りたたみサンキャップ・バケットハット', '物理的な紫外線対策に。バッグに畳んで収納可能'],
  },
  fw_backup_shoes: {
    'zh-CN': ['备用轻便换穿鞋 / 乐福鞋', '雨天湿鞋替换或正式餐厅穿搭'],
    'en-US': ['Backup lightweight flats / loafers', 'Dry backup pair after rain or for smart-casual dinners'],
    'es-MX': ['Calzado ligero de repuesto / mocasines', 'Par seco tras la lluvia o para cenas más arregladas'],
    'fr-FR': ['Chaussures légères de rechange / mocassins', 'Paire sèche après la pluie ou pour dîner au restaurant'],
    'de-DE': ['Leichte Ersatzschuhe / Loafer', 'Trockenes Ersatzpaar nach Regen oder fürs Abendessen'],
    'pt-BR': ['Calçado leve reserva / mocassim', 'Par seco após chuva ou para jantares mais arrumados'],
    'ja-JP': ['軽量予備シューズ・ローファー', '雨で靴が濡れた際の替えや少し改まった食事用'],
  },
  toi_toothbrush: {
    'zh-CN': ['便携牙刷 + 旅行装含氟牙膏 + 牙线棒', '许多环保酒店不再免费提供牙具，出发早晨洗漱后装包'],
    'en-US': ['Travel toothbrush, ≤100ml toothpaste & floss picks', 'Many hotels no longer stock free toothbrushes; pack departure morning'],
    'es-MX': ['Cepillo de viaje, pasta ≤100 ml e hilo dental', 'Muchos hoteles ecológicos ya no ofrecen cepillos; empaca al salir'],
    'fr-FR': ['Brosse à dents, dentifrice ≤100 ml & fil dentaire', 'Beaucoup d’hôtels n’en fournissent plus ; à glisser le matin du départ'],
    'de-DE': ['Reisezahnbürste, Zahnpasta ≤100 ml & Zahnseide', 'Viele Hotels stellen keine mehr gratis bereit; morgens einpacken'],
    'pt-BR': ['Escova de viagem, creme dental ≤100 ml e fio dental', 'Muitos hotéis não fornecem grátis; guarde na manhã da partida'],
    'ja-JP': ['携帯歯ブラシ＋ミニ歯磨き粉＋フロス', 'エコホテル増加でアメニティ廃止が増えているため必携'],
  },
  toi_wash_cabin: {
    'zh-CN': ['≤100ml 硅胶防漏洗护分装瓶 / 固体洗发皂', '仅带登机箱严守液体单瓶 ≤100ml 安检规定'],
    'en-US': ['≤100ml leakproof silicone bottles / solid shampoo bar', '100% TSA/airport cabin liquid compliant (≤100ml)'],
    'es-MX': ['Botellas silicona ≤100 ml o shampoo sólido', '100 % apto para control de líquidos en cabina (≤100 ml)'],
    'fr-FR': ['Flacons silicone ≤100 ml ou shampoing solide', '100 % conforme aux règles de liquides en cabine (≤100 ml)'],
    'de-DE': ['Auslaufsichere ≤100-ml-Flaschen / festes Shampoo', '100 % konform mit Handgepäck-Flüssigkeitsregeln (≤100 ml)'],
    'pt-BR': ['Frascos silicone ≤100 ml ou shampoo sólido', '100% dentro das regras de líquidos na cabine (≤100 ml)'],
    'ja-JP': ['100ml以下シリコン詰め替え容器／固形シャンプー', '液体物持ち込み制限（100ml以下）に完全適合'],
  },
  toi_wash_checked: {
    'zh-CN': ['洗发护发与沐浴旅行分装套装', '熟悉配方避免旅途水土不服导致头皮干痒'],
    'en-US': ['Travel shampoo, conditioner & body wash set', 'Avoids harsh hotel toiletries on multi-day trips'],
    'es-MX': ['Kit de viaje shampoo, acondicionador y jabón', 'Evita irritación por productos de hotel en viajes largos'],
    'fr-FR': ['Kit shampoing, après-shampoing & gel douche', 'Évite les produits d’hôtel trop agressifs sur plusieurs jours'],
    'de-DE': ['Reise-Set Shampoo, Spülung & Duschgel', 'Schont Haut und Haare bei längeren Reisen'],
    'pt-BR': ['Kit viagem shampoo, condicionador e sabonete', 'Evita ressecamento com amenidades básicas de hotel'],
    'ja-JP': ['トラベル用シャンプー・トリートメント・ボディソープ', '旅先での髪や肌の乾燥トラブルを防止'],
  },
  toi_skin_sensitive: {
    'zh-CN': ['敏感肌氨基酸洁面 + 神经酰胺屏障修护霜 + 纯物理防晒乳', '针对敏感肌定制无酒精屏障修护组合，抵御换季温差与日晒泛红'],
    'en-US': ['Gentle fragrance-free cleanser, barrier cream & mineral SPF50', 'Hypoallergenic barrier care against dry cabin air & climate shifts'],
    'es-MX': ['Limpiador suave sin fragancia, crema barrera y FPS50 mineral', 'Cuidado hipoalergénico contra aire seco de cabina y cambios de clima'],
    'fr-FR': ['Nettoyant doux sans parfum, crème barrière & SPF50 minéral', 'Soin hypoallergénique contre l’air sec en vol et le soleil'],
    'de-DE': ['Sanfter Reiniger ohne Duftstoffe, Barrierecreme & mineral. LSF50', 'Hypoallergene Pflege gegen trockene Kabinenluft & Klimawechsel'],
    'pt-BR': ['Limpador suave sem fragrância, creme barreira e FPS50 mineral', 'Cuidado hipoalergênico contra ar seco do voo e mudança de clima'],
    'ja-JP': ['低刺激洗顔＋セラミド保湿クリーム＋ノンケミカル日焼け止め', '敏感肌向けの無添加処方で機内の乾燥や気候差の赤みをガード'],
  },
  toi_skin_default: {
    'zh-CN': ['洁面乳 + 保湿面霜 + 高倍防晒霜 (≤100ml)', '跨气候飞行机舱干燥与户外紫外线双重防护'],
    'en-US': ['Facial cleanser, moisturizer & SPF50+ sunscreen (≤100ml)', 'Hydration and daily UV protection across climates'],
    'es-MX': ['Limpiador facial, hidratante y protector solar FPS50+ (≤100 ml)', 'Hidratación en vuelo y protección UV diaria'],
    'fr-FR': ['Nettoyant visage, crème hydratante & SPF50+ (≤100 ml)', 'Hydratation et protection UV quotidienne sous tous climats'],
    'de-DE': ['Gesichtsreiniger, Feuchtigkeitscreme & LSF50+ (≤100 ml)', 'Feuchtigkeit und täglicher UV-Schutz bei jedem Klima'],
    'pt-BR': ['Sabonete facial, hidratante e protetor solar FPS50+ (≤100 ml)', 'Hidratação no voo e proteção UV diária'],
    'ja-JP': ['洗顔料＋保湿クリーム＋高SPF日焼け止め (100ml以下)', '乾燥する機内と日中の強い紫外線から肌を保護'],
  },
  toi_lip_wipes: {
    'zh-CN': ['润唇膏 + 随身护手霜 + 酒精消毒干湿纸巾包', '随身包必备，机舱保湿与街头用餐随时清洁'],
    'en-US': ['Lip balm, mini hand cream & pocket sanitizing wipes', 'Cabin hydration and quick hand sanitizing on the go'],
    'es-MX': ['Bálsamo labial, crema de manos y toallitas desinfectantes', 'Hidratación en cabina e higiene de manos en cualquier lugar'],
    'fr-FR': ['Baume à lèvres, mini crème mains & lingettes désinfectantes', 'Hydratation en vol et propreté des mains en déplacement'],
    'de-DE': ['Lippenbalsam, Mini-Handcreme & Desinfektionstücher', 'Pflege bei trockener Flugluft und schnelle Hygiene unterwegs'],
    'pt-BR': ['Protetor labial, creme para mãos e lenços higienizantes', 'Hidratação na cabine e limpeza prática nas refeições'],
    'ja-JP': ['リップクリーム＋ハンドクリーム＋除菌ウェットシート', '機内の乾燥対策と外出先での手指衛生に'],
  },
  toi_masks_mist: {
    'zh-CN': ['独立包装舒缓修护贴片面膜 ×3 + 便携舒缓保湿喷雾 (50ml)', '日晒或寒风吹拂后晚间急救舒缓退红'],
    'en-US': ['Soothing sheet masks ×3 & 50ml thermal water mist', 'Calms wind-chapped or sun-exposed sensitive skin overnight'],
    'es-MX': ['3 mascarillas calmantes y bruma termal de 50 ml', 'Alivia piel irritada por viento o sol durante la noche'],
    'fr-FR': ['3 masques apaisants & brume d’eau thermale 50 ml', 'Apaise la peau sensibilisée par le vent ou le soleil'],
    'de-DE': ['3 beruhigende Tuchmasken & 50 ml Thermalwasserspray', 'Beruhigt wind- und sonnengereizte Haut über Nacht'],
    'pt-BR': ['3 máscaras calmantes e bruma termal 50 ml', 'Acalma a pele sensível após sol ou vento frio'],
    'ja-JP': ['鎮静シートマスク×3＋携帯ミスト化粧水 (50ml)', '日焼けや寒風による夜の肌荒れ・赤みをスピードケア'],
  },
  toi_makeup: {
    'zh-CN': ['便携卸妆油/卸妆湿巾 + 精简彩妆包 + 护发精油胶囊', '小样/胶囊分装省重不占地，保持全天拍照精致状态'],
    'en-US': ['Travel cleansing balm/wipes, compact makeup pouch & hair serum', 'Decanted travel-size makeup & hair care saves washbag weight'],
    'es-MX': ['Desmaquillante de viaje, estuche compacto y sérum capilar', 'Formatos mini para ahorrar peso sin perder estilo en fotos'],
    'fr-FR': ['Démaquillant voyage, trousse maquillage & sérum cheveux', 'Formats compacts pour gagner du poids dans la trousse'],
    'de-DE': ['Reise-Abschminktücher, kompaktes Make-up & Haarserum', 'Kleine Reisegrößen sparen Platz und Gewicht'],
    'pt-BR': ['Demaquilante de viagem, nécessaire compacta e sérum capilar', 'Miniaturas leves para manter o visual sem pesar na mala'],
    'ja-JP': ['クレンジングシート＋厳選メイクポーチ＋ヘアオイル', 'ミニサイズ・使い切りで軽量化しつつ撮影映えをキープ'],
  },
  toi_feminine: {
    'zh-CN': ['生理期应急卫生棉条 / 日夜护垫小包', '长途飞行作息变化易提前，备少量应急免去临时找药妆店烦恼'],
    'en-US': ['Feminine hygiene emergency pouch', 'Jet lag can shift cycles; handy emergency stash'],
    'es-MX': ['Kit de emergencia de higiene femenina', 'El desfase horario puede alterar ciclos; ten reserva a la mano'],
    'fr-FR': ['Trousse d’urgence hygiène féminine', 'Le décalage horaire peut modifier le cycle ; utile en secours'],
    'de-DE': ['Notfall-Set Damenhygiene', 'Jetlag kann den Zyklus verschieben — praktischer Vorrat'],
    'pt-BR': ['Kit emergência de higiene íntima', 'Fuso e voos podem alterar o ciclo; previna imprevistos'],
    'ja-JP': ['生理用品・エチケット緊急ポーチ', '時差や移動のストレスに備えて少量常備しておくと安心'],
  },
  toi_shaver: {
    'zh-CN': ['便携电动剃须刀（严禁含大型泡沫气雾罐登机）', 'Type-C 直充迷你剃须刀，安检合规无需剃须刀片'],
    'en-US': ['Compact electric travel shaver', 'USB-C compact electric shaver — cabin-safe without razor blades'],
    'es-MX': ['Rasuradora eléctrica portátil USB-C', 'Apta para equipaje de mano sin navajas sueltas ni aerosoles'],
    'fr-FR': ['Rasoir électrique de voyage USB-C', 'Compact et conforme en cabine sans lames ni aérosols'],
    'de-DE': ['Kompakter elektrischer Reiserasierer (USB-C)', 'Handgepäcktauglich ohne lose Klingen oder Sprühdosen'],
    'pt-BR': ['Barbeador elétrico portátil USB-C', 'Aceito na cabine sem lâminas soltas nem aerossol'],
    'ja-JP': ['携帯用USB-C充電式電気シェーバー', '替刃規制に引っかからず機内持ち込みも可能'],
  },
  toi_laundry: {
    'zh-CN': ['超浓缩纳米洗衣片 + 便携弹力晾衣绳', '0 液体安检无忧，支持酒店洗手池或投币洗衣房快速减重循环'],
    'en-US': ['Concentrated laundry detergent sheets & travel clothesline', 'Zero-liquid TSA-safe wash sheets for mid-trip capsule laundry'],
    'es-MX': ['Láminas de detergente y tendedero elástico portátil', 'Sin líquidos para lavar fácil en el hotel o lavandería'],
    'fr-FR': ['Feuilles de lessive & corde à linge de voyage', 'Zéro liquide ; idéal pour laver rapidement à l’hôtel'],
    'de-DE': ['Waschmittelblätter & elastische Reisewäscheleine', 'Flüssigkeitsfrei für die schnelle Wäsche im Waschbecken'],
    'pt-BR': ['Folhas de sabão para lavar roupas + varal portátil', 'Zero líquido; permite lavar roupas no hotel sem problemas'],
    'ja-JP': ['シート状洗濯洗剤＋携帯伸縮物干しロープ', '液体ゼロで保安検査安心。ホテル洗面台やコインランドリーに'],
  },
  elec_powerbank: {
    'zh-CN': ['10000mAh 随身充电宝（≤100Wh 严禁托运）', '民航安全铁律：充电宝严禁放入托运行李，必须随身登机'],
    'en-US': ['10,000mAh power bank (≤100Wh · Cabin ONLY)', 'Aviation safety rule: lithium power banks MUST stay in carry-on'],
    'es-MX': ['Batería portátil 10,000 mAh (≤100 Wh · SOLO cabina)', 'Regla aeronáutica: las baterías de litio van SIEMPRE en cabina'],
    'fr-FR': ['Batterie externe 10 000 mAh (≤100 Wh · Cabine)', 'Règle aérienne stricte : interdite en soute, toujours en cabine'],
    'de-DE': ['10.000-mAh-Powerbank (≤100 Wh · NUR Handgepäck)', 'Luftfahrtvorschrift: Powerbanks sind im Aufgabegepäck verboten'],
    'pt-BR': ['Power bank 10.000 mAh (≤100 Wh · SÓ na cabine)', 'Regra da aviação: baterias portáteis são proibidas na bagagem despachada'],
    'ja-JP': ['10,000mAhモバイルバッテリー（100Wh以下・預け入れ厳禁）', '航空法規定により預け荷物NG。必ず機内持ち込みバッグへ'],
  },
  elec_adapter_multi: {
    'zh-CN': ['多口快充转换插头', '多孔位快充全队共用，避免每人重复带笨重插头'],
    'en-US': ['Multi-port USB-C PD travel adapter', 'Charges multiple devices simultaneously for the whole group'],
    'es-MX': ['Adaptador multipuerto USB-C PD', 'Carga varios dispositivos del grupo al mismo tiempo sin repetir cargadores'],
    'fr-FR': ['Adaptateur multiports USB-C PD', 'Recharge plusieurs appareils du groupe depuis une seule prise'],
    'de-DE': ['Multi-Port-USB-C-PD-Reiseadapter', 'Lädt mehrere Geräte der Gruppe gleichzeitig an einer Steckdose'],
    'pt-BR': ['Adaptador multiportas USB-C PD', 'Carrega vários aparelhos do grupo ao mesmo tempo em uma tomada'],
    'ja-JP': ['USB-C PD 複数ポート変換プラグ', '同行者全員のスマホや機器を1台でまとめて急速充電'],
  },
  elec_adapter_single: {
    'zh-CN': ['多口快充转换插头', '一个插头同时搞定手机、耳机与充电宝夜间补电'],
    'en-US': ['Multi-port USB-C PD travel adapter', 'Charges phone, earbuds & power bank simultaneously from one outlet'],
    'es-MX': ['Adaptador multipuerto USB-C PD', 'Carga teléfono, audífonos y batería desde un solo enchufe'],
    'fr-FR': ['Adaptateur multiports USB-C PD', 'Charge téléphone, écouteurs et batterie sur une seule prise'],
    'de-DE': ['Multi-Port-USB-C-PD-Reiseadapter', 'Lädt Handy, Kopfhörer und Powerbank über eine Steckdose'],
    'pt-BR': ['Adaptador multiportas USB-C PD', 'Carrega celular, fones e power bank em uma única tomada'],
    'ja-JP': ['USB-C PD 複数ポート変換プラグ', 'これ1台でスマホ・イヤホン・モバイルバッテリーを同時充電'],
  },
  elec_cables: {
    'zh-CN': ['编织快充数据线 ×2（床头长线 + 日包短线）', '床头远插座用长线，随身充电宝用短线，出发早晨拔下装包'],
    'en-US': ['Braided USB-C / phone charging cables ×2', 'Long cable for hotel bedside + short cable for daypack power bank'],
    'es-MX': ['2 cables trenzados de carga rápida', 'Cable largo para el hotel y cable corto para llevar con batería'],
    'fr-FR': ['2 câbles tressés de charge rapide', 'Un câble long pour l’hôtel et un court pour la batterie en journée'],
    'de-DE': ['2 geflochtene Schnellladekabel', 'Langes Kabel fürs Hotelbett + kurzes Kabel für die Powerbank'],
    'pt-BR': ['2 cabos trançados de carregamento rápido', 'Cabo longo para tomada do hotel e cabo curto para o power bank'],
    'ja-JP': ['急速充電ケーブル×2（枕元用長め＋日帰り用短め）', 'ホテルのコンセント用と携帯バッテリー用の2本持ちが快適'],
  },
  elec_earbuds: {
    'zh-CN': ['主动降噪蓝牙耳机', '隔绝长途机舱轰鸣与新干线/城际列车噪音'],
    'en-US': ['Active noise-cancelling wireless earbuds / headphones', 'Cuts engine noise on flights and intercity trains'],
    'es-MX': ['Audífonos inalámbricos con cancelación de ruido', 'Aísla el ruido de turbinas en vuelos y trenes'],
    'fr-FR': ['Écouteurs / casque sans fil à réduction de bruit', 'Réduit le bruit des moteurs en avion et en train'],
    'de-DE': ['Bluetooth-Kopfhörer mit Active Noise Cancelling', 'Blendet Flug- und Zuggeräusche zuverlässig aus'],
    'pt-BR': ['Fones sem fio com cancelamento de ruído', 'Reduz o ruído de motores em voos e trens'],
    'ja-JP': ['ノイズキャンセリングワイヤレスイヤホン', 'フライトや新幹線・特急列車の騒音を遮断して快適に'],
  },
  elec_tracker: {
    'zh-CN': ['行李箱防丢追踪器 (AirTag / SmartTag) + 取卡针', '实时定位托运行李转盘位置，实体 SIM 卡切换备用'],
    'en-US': ['Luggage tracker tag (AirTag) & SIM ejector pin', 'Tracks checked bags in real time at transfer airports'],
    'es-MX': ['Rastreador de equipaje (AirTag) y pin para SIM', 'Ubica tu maleta documentada en tiempo real al hacer escalas'],
    'fr-FR': ['Traceur de bagage (AirTag) & épingle SIM', 'Localise les bagages en soute en temps réel lors des correspondances'],
    'de-DE': ['Gepäcktracker (AirTag) & SIM-Karten-Nadel', 'Ortet aufgegebenes Gepäck in Echtzeit beim Umsteigen'],
    'pt-BR': ['Rastreador de bagagem (AirTag) e pino para SIM', 'Rastreia malas despachadas em tempo real nas conexões'],
    'ja-JP': ['紛失防止タグ (AirTag等) ＋SIMピン', '預け荷物の場所をリアルタイム追跡。物理SIM交換用ピン付き'],
  },
};

export function getPackingSeedItemA(
  key: PackingSeedItemKeyA,
  lang: AppLanguage
): { name: string; why: string } {
  const [name, why] = pickLang(lang, SEED_ITEMS_A[key]);
  return { name, why };
}
