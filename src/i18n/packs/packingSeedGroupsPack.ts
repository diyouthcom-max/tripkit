import type { AppLanguage } from '../../types';
import { pickLang, type LangMap8 } from '../langHelper';

export type PackingGroupCopyKey =
  | 'documents'
  | 'tops_layers'
  | 'bottoms_underwear'
  | 'footwear_accessories'
  | 'toiletries'
  | 'toiletries_sensitive'
  | 'electronics'
  | 'first_aid'
  | 'first_aid_medication'
  | 'beach_water'
  | 'onsen_spa'
  | 'ski_snow'
  | 'hiking_camping'
  | 'theme_park'
  | 'fitness_sport'
  | 'baby_kids'
  | 'remote_work'
  | 'photography'
  | 'formal_event'
  | 'shopping_taxfree'
  | 'extras';

export type PackingSubCategoryKey =
  | 'sub_physical_ids'
  | 'sub_digital_passes'
  | 'sub_cards_cash'
  | 'sub_base_tops'
  | 'sub_mid_layers'
  | 'sub_weather_shells'
  | 'sub_smart_outfits'
  | 'sub_outer_bottoms'
  | 'sub_daily_underwear'
  | 'sub_sleepwear'
  | 'sub_footwear_main'
  | 'sub_weather_acc'
  | 'sub_oral_bath'
  | 'sub_skincare_sun'
  | 'sub_grooming'
  | 'sub_laundry'
  | 'sub_power_adapters'
  | 'sub_audio_trackers'
  | 'sub_oral_meds'
  | 'sub_blister_wound'
  | 'sub_prescriptions'
  | 'sub_swimwear_shoes'
  | 'sub_dry_bags_towels'
  | 'sub_beach_sunscreen'
  | 'sub_onsen_etiquette'
  | 'sub_onsen_post'
  | 'sub_slope_thermal'
  | 'sub_snow_optics'
  | 'sub_subzero_warmers'
  | 'sub_trail_footwear'
  | 'sub_trail_safety'
  | 'sub_camp_lighting'
  | 'sub_park_rides'
  | 'sub_park_recovery'
  | 'sub_workout_apparel'
  | 'sub_fitness_acc'
  | 'sub_baby_feeding'
  | 'sub_stroller_comfort'
  | 'sub_pediatric_meds'
  | 'sub_laptop_gan'
  | 'sub_peripherals'
  | 'sub_camera_body'
  | 'sub_batteries_sd'
  | 'sub_optics_support'
  | 'sub_formal_attire'
  | 'sub_garment_care'
  | 'sub_return_expansion'
  | 'sub_anti_theft'
  | 'sub_weighing_sleep';

const GROUP_MAP: Record<PackingGroupCopyKey, LangMap8<{ title: string; cubeLabel: string }>> = {
  documents: {
    'zh-CN': { title: '证件与数字通关', cubeLabel: '贴身防盗随身包 · 安检与海关秒取' },
    'en-US': { title: 'IDs, Passes & Digital QR', cubeLabel: 'Carry-on document pouch · Instant border access' },
    'es-MX': { title: 'Documentos y pases QR', cubeLabel: 'Bolsa de mano antirrobo · Acceso rápido en aduana' },
    'fr-FR': { title: 'Papiers & billets numériques', cubeLabel: 'Pochette documents cabine · Accès rapide douane' },
    'de-DE': { title: 'Dokumente & digitale Pässe', cubeLabel: 'Dokumententasche im Handgepäck · Schneller Grenzcheck' },
    'pt-BR': { title: 'Documentos e passes QR', cubeLabel: 'Porta-documentos na cabine · Acesso rápido na alfândega' },
    'ja-JP': { title: '貴重品・書類・デジタルパス', cubeLabel: '機内持ち込みパスポートポーチ · 税関ですぐ出せる位置へ' },
  },
  tops_layers: {
    'zh-CN': { title: '上装与防风保暖层', cubeLabel: '压缩收纳袋 M/L · 按天循环' },
    'en-US': { title: 'Tops & Weather Outerwear', cubeLabel: 'Compression cubes M/L · Cycle-calibrated' },
    'es-MX': { title: 'Prendas superiores y abrigo', cubeLabel: 'Cubos de compresión M/L · Calculado por ciclo' },
    'fr-FR': { title: 'Hauts & couches coupe-vent', cubeLabel: 'Cubes de compression M/L · Adapté au cycle' },
    'de-DE': { title: 'Oberteile & Wetterschutz', cubeLabel: 'Kompressionsbeutel M/L · Nach Waschzyklus' },
    'pt-BR': { title: 'Blusas e camadas de clima', cubeLabel: 'Cubos de compressão M/L · Calculado por ciclo' },
    'ja-JP': { title: 'トップス・防風・防寒アウター', cubeLabel: '圧縮ポーチ M/L · 洗濯サイクル基準' },
  },
  bottoms_underwear: {
    'zh-CN': { title: '下装与贴身内衣袜', cubeLabel: 'S/L 分格收纳袋 · 干净与待洗分仓' },
    'en-US': { title: 'Bottoms, Undergarments & Sleepwear', cubeLabel: 'Clean/laundry split cubes · Size-calibrated' },
    'es-MX': { title: 'Pantalones, ropa interior y pijama', cubeLabel: 'Cubos S/L separados · Ropa limpia y por lavar' },
    'fr-FR': { title: 'Bas, sous-vêtements & nuit', cubeLabel: 'Cubes S/L séparés · Propre / à laver' },
    'de-DE': { title: 'Hosen, Unterwäsche & Nachtwäsche', cubeLabel: 'S/L-Beutel getrennt · Sauber & Schmutzwäsche' },
    'pt-BR': { title: 'Calças, roupas íntimas e pijama', cubeLabel: 'Cubos S/L divididos · Limpas e usadas' },
    'ja-JP': { title: 'ボトムス・下着・ルームウェア', cubeLabel: '仕分けポーチ S/L · 未使用と洗濯物を分離' },
  },
  footwear_accessories: {
    'zh-CN': { title: '鞋履与随行配饰', cubeLabel: '独立防尘鞋袋 + 随身快取侧袋' },
    'en-US': { title: 'Footwear & Daily Accessories', cubeLabel: 'Dust-proof shoe bag & daypack pocket' },
    'es-MX': { title: 'Calzado y accesorios diarios', cubeLabel: 'Bolsa para calzado + bolsillo exterior' },
    'fr-FR': { title: 'Chaussures & accessoires du jour', cubeLabel: 'Sac à chaussures + poche accès rapide' },
    'de-DE': { title: 'Schuhe & Tages-Accessoires', cubeLabel: 'Schuhbeutel + Griffbereit-Seitentasche' },
    'pt-BR': { title: 'Calçados e acessórios diários', cubeLabel: 'Saco para calçados + bolso externo' },
    'ja-JP': { title: '靴・日々の外出アクセサリー', cubeLabel: 'シューズバッグ＋デイパック外ポケット' },
  },
  toiletries: {
    'zh-CN': { title: '洗漱护理', cubeLabel: '100ml 干湿分离防漏洗漱包 · 顶层快取' },
    'en-US': { title: 'Toiletries & Personal Care', cubeLabel: '100ml clear leakproof washbag · Top access' },
    'es-MX': { title: 'Aseo y cuidado personal', cubeLabel: 'Neceser antifugas 100 ml · Acceso superior' },
    'fr-FR': { title: 'Trousse de toilette & soins', cubeLabel: 'Trousse étanche 100 ml · Accès facile en haut' },
    'de-DE': { title: 'Kulturbeutel & Körperpflege', cubeLabel: 'Auslaufsichere 100-ml-Tasche · Oben verstauen' },
    'pt-BR': { title: 'Higiene e cuidados pessoais', cubeLabel: 'Nécessaire 100 ml antivazamento · Topo da mala' },
    'ja-JP': { title: '洗面用具・スキンケア', cubeLabel: '100ml対応・防水ポーチ · 取り出しやすい上層へ' },
  },
  toiletries_sensitive: {
    'zh-CN': { title: '洗护与敏感肌修护', cubeLabel: '100ml 干湿分离防漏洗漱包 · 顶层快取' },
    'en-US': { title: 'Washbag & Sensitive Skincare', cubeLabel: '100ml clear leakproof washbag · Top access' },
    'es-MX': { title: 'Aseo y cuidado piel sensible', cubeLabel: 'Neceser antifugas 100 ml · Acceso superior' },
    'fr-FR': { title: 'Toilette & soin peau sensible', cubeLabel: 'Trousse étanche 100 ml · Accès facile en haut' },
    'de-DE': { title: 'Pflege & sensible Haut', cubeLabel: 'Auslaufsichere 100-ml-Tasche · Oben verstauen' },
    'pt-BR': { title: 'Higiene e pele sensível', cubeLabel: 'Nécessaire 100 ml antivazamento · Topo da mala' },
    'ja-JP': { title: '洗面用具・敏感肌ケア', cubeLabel: '100ml対応・防水ポーチ · 取り出しやすい上層へ' },
  },
  electronics: {
    'zh-CN': { title: '电子数码与供电', cubeLabel: '防撞数码收纳包 · 锂电池严禁托运' },
    'en-US': { title: 'Tech, Chargers & Adapters', cubeLabel: 'Padded tech pouch · Lithium batteries in cabin ONLY' },
    'es-MX': { title: 'Electrónica y cargadores', cubeLabel: 'Estuche acolchado · Baterías de litio SOLO en cabina' },
    'fr-FR': { title: 'Électronique & chargeurs', cubeLabel: 'Trousse tech rembourrée · Batteries lithium en cabine' },
    'de-DE': { title: 'Technik, Kabel & Adapter', cubeLabel: 'Gepolsterte Techniktasche · Akkus NUR ins Handgepäck' },
    'pt-BR': { title: 'Eletrônicos e carregadores', cubeLabel: 'Estojo acolchoado · Baterias de lítio SÓ na cabine' },
    'ja-JP': { title: 'ガジェット・充電・変換プラグ', cubeLabel: '衝撃保護ポーチ · リチウム電池は預け入れ厳禁' },
  },
  first_aid: {
    'zh-CN': { title: '医药急救', cubeLabel: '随身便携分格药盒 · 处方药严禁托运' },
    'en-US': { title: 'First Aid & Medications', cubeLabel: 'Compact pill organizer · Keep critical meds in cabin' },
    'es-MX': { title: 'Botiquín y medicamentos', cubeLabel: 'Pastillero portátil · Lleva medicinas clave en cabina' },
    'fr-FR': { title: 'Pharmacie & premiers secours', cubeLabel: 'Pilulier compact · Médicaments essentiels en cabine' },
    'de-DE': { title: 'Reiseapotheke & Erste Hilfe', cubeLabel: 'Kompakte Medikamentenbox · Wichtiges ins Handgepäck' },
    'pt-BR': { title: 'Farmácia e primeiros socorros', cubeLabel: 'Porta-comprimidos compacto · Remédios na cabine' },
    'ja-JP': { title: '常備薬・救急セット', cubeLabel: '携帯ピルケース · 大切な薬は必ず機内持ち込みへ' },
  },
  first_aid_medication: {
    'zh-CN': { title: '医药与处方防护', cubeLabel: '随身便携分格药盒 · 处方药严禁托运' },
    'en-US': { title: 'First Aid & Prescriptions', cubeLabel: 'Compact pill organizer · Keep critical meds in cabin' },
    'es-MX': { title: 'Botiquín y recetas médicas', cubeLabel: 'Pastillero portátil · Recetas siempre en cabina' },
    'fr-FR': { title: 'Pharmacie & ordonnances', cubeLabel: 'Pilulier compact · Traitements vitaux en cabine' },
    'de-DE': { title: 'Apotheke & Dauermedikation', cubeLabel: 'Kompakte Box · Rezepte & Medikamente ins Handgepäck' },
    'pt-BR': { title: 'Farmácia e medicação contínua', cubeLabel: 'Porta-comprimidos · Receitas e remédios na cabine' },
    'ja-JP': { title: '救急キット・処方薬対策', cubeLabel: '携帯ピルケース · 処方薬は機内持ち込み必須' },
  },
  beach_water: {
    'zh-CN': { title: '海滨度假与亲水装备', cubeLabel: '独立防水干湿分离仓 · 泥沙湿物不串味' },
    'en-US': { title: 'Beach, Swim & Snorkel Gear', cubeLabel: 'Waterproof wet/dry sack · Isolates sand & damp gear' },
    'es-MX': { title: 'Playa, natación y esnórquel', cubeLabel: 'Bolsa seca impermeable · Aísla arena y ropa húmeda' },
    'fr-FR': { title: 'Plage, baignade & snorkeling', cubeLabel: 'Sac étanche sec/humide · Isole sable et humidité' },
    'de-DE': { title: 'Strand, Schwimmen & Schnorcheln', cubeLabel: 'Wasserdichter Nassbeutel · Trennt Sand & Feuchtigkeit' },
    'pt-BR': { title: 'Praia, natação e snorkel', cubeLabel: 'Saco estanque seco/molhado · Isola areia e umidade' },
    'ja-JP': { title: 'ビーチ・スイム・海辺ギア', cubeLabel: '防水ドライバッグ · 砂や濡れ物を完全分離' },
  },
  onsen_spa: {
    'zh-CN': { title: '温泉泡汤与SPA装备', cubeLabel: '便携网眼泡汤提篮袋 · 一拎即走' },
    'en-US': { title: 'Onsen, Hot Spring & Spa Kit', cubeLabel: 'Mesh bath tote · Grab-and-go for hot springs' },
    'es-MX': { title: 'Kit de termas y spa', cubeLabel: 'Bolsa de malla · Lista para llevar al baño termal' },
    'fr-FR': { title: 'Kit sources chaudes & spa', cubeLabel: 'Sac filet de bain · Prêt-à-porter pour les thermes' },
    'de-DE': { title: 'Onsen-, Thermen- & Spa-Set', cubeLabel: 'Netz-Badetasche · Sofort griffbereit fürs Thermalbad' },
    'pt-BR': { title: 'Kit de termas e spa', cubeLabel: 'Bolsa telada de banho · Prática para ir às termas' },
    'ja-JP': { title: '温泉・スパお出かけセット', cubeLabel: 'メッシュ湯かごバッグ · そのまま大浴場へ直行' },
  },
  ski_snow: {
    'zh-CN': { title: '滑雪与极寒冰雪装备', cubeLabel: '大号压缩袋 XL · 防雪防水护具分仓' },
    'en-US': { title: 'Ski, Snow & Sub-Zero Gear', cubeLabel: 'XL compression cube · Snow & thermal protection' },
    'es-MX': { title: 'Equipo de esquí y frío extremo', cubeLabel: 'Cubo de compresión XL · Protección térmica y nieve' },
    'fr-FR': { title: 'Équipement ski & grand froid', cubeLabel: 'Cube compression XL · Protection neige et froid' },
    'de-DE': { title: 'Ski-, Schnee- & Frostausrüstung', cubeLabel: 'XL-Kompressionsbeutel · Schnee- & Kälteschutz' },
    'pt-BR': { title: 'Equipamento de esqui e neve', cubeLabel: 'Cubo de compressão XL · Proteção térmica e neve' },
    'ja-JP': { title: 'スキー・雪山・極寒防寒ギア', cubeLabel: 'XL圧縮バッグ · 防水・防寒小物まとめ' },
  },
  hiking_camping: {
    'zh-CN': { title: '徒步登山与露营装备', cubeLabel: '独立耐脏户外袋 · 注意登山杖尖须托运' },
    'en-US': { title: 'Hiking, Trail & Camping Gear', cubeLabel: 'Durable outdoor sack · Trekking poles must be checked' },
    'es-MX': { title: 'Senderismo y campamento', cubeLabel: 'Bolsa outdoor resistente · Bastones deben documentarse' },
    'fr-FR': { title: 'Randonnée, trail & camping', cubeLabel: 'Sac outdoor robuste · Bâtons de marche en soute' },
    'de-DE': { title: 'Wandern, Trail & Camping', cubeLabel: 'Robuster Outdoor-Beutel · Trekkingstöcke ins Aufgabegepäck' },
    'pt-BR': { title: 'Trilhas, trekking e camping', cubeLabel: 'Saco outdoor resistente · Bastões devem ser despachados' },
    'ja-JP': { title: '登山・ハイキング・キャンプ', cubeLabel: '頑丈アウトドアバッグ · トレッキングポールは預け入れ必須' },
  },
  theme_park: {
    'zh-CN': { title: '主题乐园暴走装备', cubeLabel: '轻便解放双手斜挎包 · 全天排队刷项目不断电' },
    'en-US': { title: 'Theme Park All-Day Kit', cubeLabel: 'Hands-free park crossbody · All-day queue survival' },
    'es-MX': { title: 'Kit de día completo en parques', cubeLabel: 'Bandolera manos libres · Supervivencia todo el día' },
    'fr-FR': { title: 'Kit journée parc d’attractions', cubeLabel: 'Sacoche mains libres · Confort files d’attente' },
    'de-DE': { title: 'Freizeitpark-Ganztages-Set', cubeLabel: 'Freihand-Umhängetasche · Fit für lange Warteschlangen' },
    'pt-BR': { title: 'Kit dia inteiro em parques', cubeLabel: 'Bolsa transversal prática · Sobrevivência nas filas' },
    'ja-JP': { title: 'テーマパーク終日攻略セット', cubeLabel: '両手が空く斜め掛けバッグ · 長時間待ちも快適' },
  },
  fitness_sport: {
    'zh-CN': { title: '运动健身与晨跑装备', cubeLabel: '透气运动小袋 · 吸湿速干不捂汗' },
    'en-US': { title: 'Gym, Running & Activewear', cubeLabel: 'Breathable activewear pouch · Quick-dry kit' },
    'es-MX': { title: 'Gimnasio, running y deporte', cubeLabel: 'Bolsa transpirable deportiva · Secado rápido' },
    'fr-FR': { title: 'Sport, fitness & footing', cubeLabel: 'Pochette sport respirante · Séchage rapide' },
    'de-DE': { title: 'Fitness, Laufen & Sport', cubeLabel: 'Atmungsaktiver Sportbeutel · Schnelltrocknend' },
    'pt-BR': { title: 'Academia, corrida e esportes', cubeLabel: 'Bolsa esportiva respirável · Secagem rápida' },
    'ja-JP': { title: 'ジム・ランニング・運動着', cubeLabel: '通気性スポーツポーチ · 速乾ウェア一式' },
  },
  baby_kids: {
    'zh-CN': { title: '母婴与儿童随行', cubeLabel: '登机妈咪快取包 + 托运补给仓' },
    'en-US': { title: 'Baby & Kids Gear', cubeLabel: 'Cabin diaper quick-grab kit & family supplies' },
    'es-MX': { title: 'Equipo para bebé y niños', cubeLabel: 'Pañalera de acceso rápido en cabina + suministros' },
    'fr-FR': { title: 'Équipement bébé & enfants', cubeLabel: 'Sac à langer cabine accès rapide + réserves' },
    'de-DE': { title: 'Baby- & Kinderausstattung', cubeLabel: 'Wickeltasche für die Kabine + Familienvorrat' },
    'pt-BR': { title: 'Itens para bebê e crianças', cubeLabel: 'Bolsa de mão fácil acesso + suprimentos da família' },
    'ja-JP': { title: 'ベビー・キッズ同行セット', cubeLabel: '機内すぐ取り出せるマザーズバッグ＋予備収納' },
  },
  remote_work: {
    'zh-CN': { title: '远程办公套件', cubeLabel: '随身防震电脑隔层 · 过安检独立易取' },
    'en-US': { title: 'Remote Work & Office Kit', cubeLabel: 'Padded laptop sleeve · Quick airport security tray access' },
    'es-MX': { title: 'Kit de trabajo remoto y oficina', cubeLabel: 'Funda acolchada de laptop · Acceso rápido en seguridad' },
    'fr-FR': { title: 'Kit télétravail & bureau mobile', cubeLabel: 'Housse PC rembourrée · Accès rapide au contrôle sûreté' },
    'de-DE': { title: 'Remote-Work & Büro-Set', cubeLabel: 'Gepolstertes Laptopfach · Schneller Zugriff am Security-Check' },
    'pt-BR': { title: 'Kit home office e trabalho', cubeLabel: 'Compartimento acolchoado · Fácil acesso no raio-X' },
    'ja-JP': { title: 'リモートワーク・仕事機材', cubeLabel: '衝撃保護PCスリーブ · 保安検査で即取り出し可能' },
  },
  photography: {
    'zh-CN': { title: '摄影与影像器材', cubeLabel: '随身防撞相机内胆 · 备用锂电池严禁托运' },
    'en-US': { title: 'Photography & Camera Gear', cubeLabel: 'Padded camera insert · Spare batteries in cabin ONLY' },
    'es-MX': { title: 'Fotografía y equipo de cámara', cubeLabel: 'Inserto acolchado · Baterías extra SOLO en cabina' },
    'fr-FR': { title: 'Photo, vidéo & drone', cubeLabel: 'Insert photo rembourré · Batteries de rechange en cabine' },
    'de-DE': { title: 'Kamera- & Fotoausrüstung', cubeLabel: 'Gepolsterter Kameraeinsatz · Ersatzakkus NUR ins Handgepäck' },
    'pt-BR': { title: 'Fotografia e câmera', cubeLabel: 'Divisória acolchoada · Baterias extras SÓ na cabine' },
    'ja-JP': { title: 'カメラ・撮影・ドローン機材', cubeLabel: '保護カメラインナー · 予備バッテリーは預け入れ厳禁' },
  },
  formal_event: {
    'zh-CN': { title: '正装与重要场合', cubeLabel: '防皱西装/礼服折叠袋 · 顶层平铺免压' },
    'en-US': { title: 'Formal & Occasion Attire', cubeLabel: 'Garment folder · Pack flat on top layer' },
    'es-MX': { title: 'Ropa formal y ocasiones especiales', cubeLabel: 'Portatrajes plegable · Colocar plano en la capa superior' },
    'fr-FR': { title: 'Tenue habillée & événements', cubeLabel: 'Housse anti-plis · À poser à plat sur le dessus' },
    'de-DE': { title: 'Abendgarderobe & Business-Look', cubeLabel: 'Hemden-/Kleiderhülle · Flach ganz oben packen' },
    'pt-BR': { title: 'Traje social e eventos', cubeLabel: 'Organizador antirrugas · Colocar reto por cima de tudo' },
    'ja-JP': { title: 'フォーマル・特別ディナー装い', cubeLabel: 'ガーメントケース · シワ防止のため最上段に平置き' },
  },
  shopping_taxfree: {
    'zh-CN': { title: '免税血拼与扩容收纳', cubeLabel: '去程折叠塞角落 · 返程秒变第二件托运/手提袋' },
    'en-US': { title: 'Tax-Free Shopping & Extra Bag Kit', cubeLabel: 'Packs flat outbound · Expands for souvenirs inbound' },
    'es-MX': { title: 'Compras libres de impuestos y bolsa extra', cubeLabel: 'Se pliega a la ida · Se expande para compras al regreso' },
    'fr-FR': { title: 'Shopping détaxé & sac d’appoint', cubeLabel: 'Plié à l’aller · Déplié pour les achats au retour' },
    'de-DE': { title: 'Tax-Free-Shopping & Zusatztasche', cubeLabel: 'Auf dem Hinflug flach · Für Souvenirs auf dem Rückflug' },
    'pt-BR': { title: 'Compras tax-free e bolsa extra', cubeLabel: 'Vai dobrada na ida · Expande para lembranças na volta' },
    'ja-JP': { title: '免税ショッピング・拡張バッグ', cubeLabel: '往路は薄く収納 · 復路はお土産用サブバッグに変身' },
  },
  extras: {
    'zh-CN': { title: '随身日包与实用补充', cubeLabel: '外层快取口袋 · 飞行舒适与防盗' },
    'en-US': { title: 'Daypack & Travel Extras', cubeLabel: 'Outer quick-grab pocket · Flight comfort & security' },
    'es-MX': { title: 'Mochila de día y extras útiles', cubeLabel: 'Bolsillo exterior rápido · Comodidad en vuelo y seguridad' },
    'fr-FR': { title: 'Sac de jour & extras pratiques', cubeLabel: 'Poche extérieure rapide · Confort en vol & antivol' },
    'de-DE': { title: 'Tagesrucksack & Reise-Extras', cubeLabel: 'Außenfach · Flugkomfort & Diebstahlschutz' },
    'pt-BR': { title: 'Mochila do dia e extras úteis', cubeLabel: 'Bolso externo rápido · Conforto no voo e antifurto' },
    'ja-JP': { title: 'デイパック小物・便利グッズ', cubeLabel: '外ポケット · フライトの快適さと防犯対策' },
  },
};

const SUBCAT_MAP: Record<PackingSubCategoryKey, LangMap8<string>> = {
  sub_physical_ids: {
    'zh-CN': '通关实体证件',
    'en-US': 'Physical Border IDs',
    'es-MX': 'Documentos físicos de viaje',
    'fr-FR': 'Papiers d’identité physiques',
    'de-DE': 'Physische Reisedokumente',
    'pt-BR': 'Documentos físicos de viagem',
    'ja-JP': 'パスポート・物理書類',
  },
  sub_digital_passes: {
    'zh-CN': '0g 数字凭证',
    'en-US': '0g Digital Passes',
    'es-MX': 'Pases digitales (0 g)',
    'fr-FR': 'Billets numériques (0 g)',
    'de-DE': 'Digitale Pässe (0 g)',
    'pt-BR': 'Passes digitais (0 g)',
    'ja-JP': '0g デジタル控・QR',
  },
  sub_cards_cash: {
    'zh-CN': '跨境支付与单据',
    'en-US': 'Cards, Cash & Receipts',
    'es-MX': 'Tarjetas, efectivo y recibos',
    'fr-FR': 'Cartes, espèces & reçus',
    'de-DE': 'Karten, Bargeld & Belege',
    'pt-BR': 'Cartões, dinheiro e recibos',
    'ja-JP': '決済カード・現金・領収書',
  },
  sub_base_tops: {
    'zh-CN': '贴身基础打底',
    'en-US': 'Daily Base Tops',
    'es-MX': 'Camisetas base diarias',
    'fr-FR': 'Hauts de base quotidiens',
    'de-DE': 'Tägliche Basis-Oberteile',
    'pt-BR': 'Camisetas básicas diárias',
    'ja-JP': '基本トップス・インナー',
  },
  sub_mid_layers: {
    'zh-CN': '锁温叠穿中层',
    'en-US': 'Warmth Mid-Layers',
    'es-MX': 'Capas medias térmicas',
    'fr-FR': 'Couches intermédiaires chaudes',
    'de-DE': 'Wärmende Zwischenschichten',
    'pt-BR': 'Camadas intermediárias térmicas',
    'ja-JP': '保温ミドルレイヤー',
  },
  sub_weather_shells: {
    'zh-CN': '防风防雨防晒外层',
    'en-US': 'Weather Protection Shells',
    'es-MX': 'Capas contra viento, lluvia y sol',
    'fr-FR': 'Couches pluie, vent & soleil',
    'de-DE': 'Wind-, Regen- & Sonnenschutz',
    'pt-BR': 'Corta-vento, chuva e UV',
    'ja-JP': '防風・レイン・UVアウター',
  },
  sub_smart_outfits: {
    'zh-CN': '街拍与商务穿搭',
    'en-US': 'Smart & Photo Outfits',
    'es-MX': 'Atuendos casuales y formales',
    'fr-FR': 'Tenues chic & ville',
    'de-DE': 'Smart-Casual & Business',
    'pt-BR': 'Looks casuais e executivos',
    'ja-JP': '街歩き・ビジネスウェア',
  },
  sub_outer_bottoms: {
    'zh-CN': '外穿百搭下装',
    'en-US': 'Outer Bottoms',
    'es-MX': 'Pantalones versátiles',
    'fr-FR': 'Pantalons & bas polyvalents',
    'de-DE': 'Vielseitige Hosen',
    'pt-BR': 'Calças e bermudas',
    'ja-JP': '着回しボトムス',
  },
  sub_daily_underwear: {
    'zh-CN': '每日贴身换洗',
    'en-US': 'Daily Undergarments & Socks',
    'es-MX': 'Ropa interior y calcetines',
    'fr-FR': 'Sous-vêtements & chaussettes',
    'de-DE': 'Unterwäsche & Socken',
    'pt-BR': 'Roupas íntimas e meias',
    'ja-JP': '毎日替える下着・靴下',
  },
  sub_sleepwear: {
    'zh-CN': '酒店睡眠家居',
    'en-US': 'Sleepwear & Lounge',
    'es-MX': 'Pijama y descanso',
    'fr-FR': 'Pyjama & détente',
    'de-DE': 'Schlaf- & Loungewear',
    'pt-BR': 'Pijama e descanso',
    'ja-JP': 'ホテル用パジャマ',
  },
  sub_footwear_main: {
    'zh-CN': '主力与备用鞋履',
    'en-US': 'Primary & Backup Footwear',
    'es-MX': 'Calzado principal y repuesto',
    'fr-FR': 'Chaussures principales & secours',
    'de-DE': 'Haupt- & Ersatzschuhe',
    'pt-BR': 'Calçado principal e reserva',
    'ja-JP': 'メイン靴・予備シューズ',
  },
  sub_weather_acc: {
    'zh-CN': '晴雨防晒与保暖配饰',
    'en-US': 'Weather & Sun Accessories',
    'es-MX': 'Accesorios de lluvia, sol y frío',
    'fr-FR': 'Accessoires pluie, soleil & froid',
    'de-DE': 'Wetter-, Sonnen- & Kälteschutz',
    'pt-BR': 'Acessórios de chuva, sol e frio',
    'ja-JP': '晴雨・紫外線・防寒小物',
  },
  sub_oral_bath: {
    'zh-CN': '口腔与沐浴清洁',
    'en-US': 'Oral & Bath Care',
    'es-MX': 'Higiene bucal y baño',
    'fr-FR': 'Hygiène dentaire & bain',
    'de-DE': 'Mund- & Duschpflege',
    'pt-BR': 'Higiene bucal e banho',
    'ja-JP': 'オーラル・バスケア',
  },
  sub_skincare_sun: {
    'zh-CN': '面部护肤与防晒',
    'en-US': 'Skincare & Sun Protection',
    'es-MX': 'Cuidado facial y bloqueador',
    'fr-FR': 'Soins du visage & protection UV',
    'de-DE': 'Gesichtspflege & Sonnenschutz',
    'pt-BR': 'Cuidado facial e protetor solar',
    'ja-JP': 'スキンケア・日焼け止め',
  },
  sub_grooming: {
    'zh-CN': '精致美护与理容',
    'en-US': 'Grooming & Beauty',
    'es-MX': 'Maquillaje y arreglo personal',
    'fr-FR': 'Beauté & rasage',
    'de-DE': 'Pflege & Kosmetik',
    'pt-BR': 'Beleza e cuidados extras',
    'ja-JP': 'メイク・身だしなみ',
  },
  sub_laundry: {
    'zh-CN': '旅途洗衣减重',
    'en-US': 'Mid-Trip Laundry',
    'es-MX': 'Lavandería ligera en ruta',
    'fr-FR': 'Lessive légère en voyage',
    'de-DE': 'Reisewäsche unterwegs',
    'pt-BR': 'Lavanderia leve na viagem',
    'ja-JP': '旅先での洗濯セット',
  },
  sub_power_adapters: {
    'zh-CN': '随身供电与转换',
    'en-US': 'Power & Adapters',
    'es-MX': 'Energía y adaptadores',
    'fr-FR': 'Batteries & adaptateurs',
    'de-DE': 'Stromversorgung & Adapter',
    'pt-BR': 'Energia e adaptadores',
    'ja-JP': '電源・充電・変換プラグ',
  },
  sub_audio_trackers: {
    'zh-CN': '随身影音与防丢配件',
    'en-US': 'Audio & Smart Trackers',
    'es-MX': 'Audio y rastreadores',
    'fr-FR': 'Audio & traceurs de bagages',
    'de-DE': 'Audio & Gepäck-Tracker',
    'pt-BR': 'Áudio e rastreadores',
    'ja-JP': 'オーディオ・紛失防止タグ',
  },
  sub_oral_meds: {
    'zh-CN': '内服应急常备药',
    'en-US': 'Oral Emergency Meds',
    'es-MX': 'Medicamentos básicos de emergencia',
    'fr-FR': 'Médicaments d’urgence',
    'de-DE': 'Reisemedikamente',
    'pt-BR': 'Medicamentos de emergência',
    'ja-JP': '内服・常備薬',
  },
  sub_blister_wound: {
    'zh-CN': '外伤防磨与防护',
    'en-US': 'Blister & Wound Care',
    'es-MX': 'Curación y protección de ampollas',
    'fr-FR': 'Pansements & anti-ampoules',
    'de-DE': 'Blasen- & Wundversorgung',
    'pt-BR': 'Curativos e proteção para bolhas',
    'ja-JP': '靴擦れ・キズ処置',
  },
  sub_prescriptions: {
    'zh-CN': '个人规律处方药',
    'en-US': 'Personal Prescriptions',
    'es-MX': 'Recetas médicas personales',
    'fr-FR': 'Traitements sur ordonnance',
    'de-DE': 'Persönliche Rezepte',
    'pt-BR': 'Prescrições pessoais',
    'ja-JP': '個人の処方薬・証明',
  },
  sub_swimwear_shoes: {
    'zh-CN': '下水泳装与涉水鞋',
    'en-US': 'Swimwear & Water Footwear',
    'es-MX': 'Traje de baño y calzado acuático',
    'fr-FR': 'Maillots & chaussures d’eau',
    'de-DE': 'Badekleidung & Wasserschuhe',
    'pt-BR': 'Roupas de banho e calçado aquático',
    'ja-JP': '水着・マリンシューズ',
  },
  sub_dry_bags_towels: {
    'zh-CN': '防水隔离与速干收纳',
    'en-US': 'Dry Bags & Towels',
    'es-MX': 'Bolsas secas y toallas',
    'fr-FR': 'Sacs étanches & serviettes',
    'de-DE': 'Trockenbeutel & Handtücher',
    'pt-BR': 'Bolsas estanques e toalhas',
    'ja-JP': '防水バッグ・速乾タオル',
  },
  sub_beach_sunscreen: {
    'zh-CN': '海岛防晒与晒后修护',
    'en-US': 'Sunscreen & After-Sun Care',
    'es-MX': 'Bloqueador marino y post-solar',
    'fr-FR': 'Solaire marin & après-soleil',
    'de-DE': 'Riff-Sonnenschutz & After-Sun',
    'pt-BR': 'Protetor marinho e pós-sol',
    'ja-JP': '防水日焼け止め・アフターケア',
  },
  sub_onsen_etiquette: {
    'zh-CN': '日式泡汤礼仪必备',
    'en-US': 'Onsen Etiquette Essentials',
    'es-MX': 'Básicos para baños termales',
    'fr-FR': 'Essentiels étiquette onsen',
    'de-DE': 'Onsen-Etikette-Basics',
    'pt-BR': 'Essenciais para termas/onsen',
    'ja-JP': '温泉マナー必需品',
  },
  sub_onsen_post: {
    'zh-CN': '汤后保湿与隐私贴士',
    'en-US': 'Post-Bath Hydration & Cover',
    'es-MX': 'Hidratación post-baño y privacidad',
    'fr-FR': 'Hydratation & patchs post-bain',
    'de-DE': 'Pflege nach dem Bad & Abdeckung',
    'pt-BR': 'Hidratação pós-banho e cobertura',
    'ja-JP': '入浴後保湿・タトゥーカバー',
  },
  sub_slope_thermal: {
    'zh-CN': '雪场贴身防护层',
    'en-US': 'Slope Thermal Protection',
    'es-MX': 'Protección térmica en pista',
    'fr-FR': 'Protection thermique sur pistes',
    'de-DE': 'Thermoschutz auf der Piste',
    'pt-BR': 'Proteção térmica na neve',
    'ja-JP': 'ゲレンデ防寒レイヤー',
  },
  sub_snow_optics: {
    'zh-CN': '雪地防滑与护目',
    'en-US': 'Snow Optics & Ice Traction',
    'es-MX': 'Antiparras y tracción en hielo',
    'fr-FR': 'Masque ski & crampons glace',
    'de-DE': 'Skibrille & Schuhspikes',
    'pt-BR': 'Óculos de neve e tração no gelo',
    'ja-JP': '雪目対策・凍結路面滑り止め',
  },
  sub_subzero_warmers: {
    'zh-CN': '极寒锁温与电子防冻',
    'en-US': 'Sub-Zero Warmers',
    'es-MX': 'Calentadores bajo cero',
    'fr-FR': 'Chaufferettes grand froid',
    'de-DE': 'Hand- & Taschenwärmer',
    'pt-BR': 'Aquecedores térmicos',
    'ja-JP': '極寒カイロ・低温対策',
  },
  sub_trail_footwear: {
    'zh-CN': '山野步鞋与负重系统',
    'en-US': 'Trail Footwear & Daypack',
    'es-MX': 'Calzado de sendero y mochila',
    'fr-FR': 'Chaussures trail & sac à dos',
    'de-DE': 'Wanderschuhe & Tagesrucksack',
    'pt-BR': 'Calçado de trilha e mochila',
    'ja-JP': 'トレッキング靴・ザック',
  },
  sub_trail_safety: {
    'zh-CN': '户外补给与安全应急',
    'en-US': 'Trail Nutrition & Safety',
    'es-MX': 'Energía y seguridad en montaña',
    'fr-FR': 'Ravitaillement & sécurité',
    'de-DE': 'Verpflegung & Notfallschutz',
    'pt-BR': 'Energia e segurança na trilha',
    'ja-JP': '行動食・アウトドア安全装備',
  },
  sub_camp_lighting: {
    'zh-CN': '露营照明与休憩',
    'en-US': 'Camp Lighting & Mat',
    'es-MX': 'Iluminación y tapete de camping',
    'fr-FR': 'Éclairage & tapis de camp',
    'de-DE': 'Camp-Beleuchtung & Unterlage',
    'pt-BR': 'Iluminação e tapete de camping',
    'ja-JP': 'キャンプ照明・レジャーシート',
  },
  sub_park_rides: {
    'zh-CN': '水上项目与排队防护',
    'en-US': 'Water Rides & Queue Gear',
    'es-MX': 'Atracciones de agua y filas',
    'fr-FR': 'Attractions d’eau & files d’attente',
    'de-DE': 'Wasserbahnen & Wetterschutz',
    'pt-BR': 'Atrações aquáticas e filas',
    'ja-JP': '水濡れ・屋外待ち対策',
  },
  sub_park_recovery: {
    'zh-CN': '花车占座与夜间回血',
    'en-US': 'Parade Seating & Foot Recovery',
    'es-MX': 'Asiento para desfiles y descanso',
    'fr-FR': 'Assise parade & récupération pieds',
    'de-DE': 'Sitzkissen & Fußerholung',
    'pt-BR': 'Assento para desfiles e alívio',
    'ja-JP': 'パレード待ち・夜の足ケア',
  },
  sub_workout_apparel: {
    'zh-CN': '训练速干穿搭',
    'en-US': 'Workout Apparel',
    'es-MX': 'Ropa deportiva de secado rápido',
    'fr-FR': 'Tenue de sport respirante',
    'de-DE': 'Funktions-Sportbekleidung',
    'pt-BR': 'Roupas esportivas dry-fit',
    'ja-JP': '速乾ワークアウトウェア',
  },
  sub_fitness_acc: {
    'zh-CN': '随身轻器械配件',
    'en-US': 'Portable Fitness Accessories',
    'es-MX': 'Accesorios portátiles de fitness',
    'fr-FR': 'Accessoires fitness compacts',
    'de-DE': 'Kompaktes Fitness-Zubehör',
    'pt-BR': 'Acessórios fitness portáteis',
    'ja-JP': '携帯トレーニング小物',
  },
  sub_baby_feeding: {
    'zh-CN': '喂养与尿布清洁',
    'en-US': 'Feeding & Diapering',
    'es-MX': 'Alimentación y cambio de pañal',
    'fr-FR': 'Repas & change bébé',
    'de-DE': 'Füttern & Wickeln',
    'pt-BR': 'Alimentação e troca de fraldas',
    'ja-JP': '授乳・ミルク・おむつケア',
  },
  sub_stroller_comfort: {
    'zh-CN': '推车背带与安抚',
    'en-US': 'Stroller, Carrier & Comfort',
    'es-MX': 'Carriola, portabebés y entretenimiento',
    'fr-FR': 'Poussette, porte-bébé & calme',
    'de-DE': 'Buggy, Trage & Beschäftigung',
    'pt-BR': 'Carrinho, canguru e distração',
    'ja-JP': 'ベビーカー・抱っこ紐・機内対策',
  },
  sub_pediatric_meds: {
    'zh-CN': '儿童专享医疗包',
    'en-US': 'Pediatric Health Kit',
    'es-MX': 'Botiquín pediátrico de viaje',
    'fr-FR': 'Trousse médicale enfant',
    'de-DE': 'Kinder-Reiseapotheke',
    'pt-BR': 'Kit médico infantil',
    'ja-JP': '子ども専用メディカルポーチ',
  },
  sub_laptop_gan: {
    'zh-CN': '主力终端与供电',
    'en-US': 'Laptop & GaN Power',
    'es-MX': 'Laptop y cargador GaN',
    'fr-FR': 'Ordinateur & charge GaN',
    'de-DE': 'Laptop & GaN-Netzteil',
    'pt-BR': 'Notebook e carregador GaN',
    'ja-JP': 'ノートPC・GaN急速電源',
  },
  sub_peripherals: {
    'zh-CN': '高效外设与人体工学',
    'en-US': 'Peripherals & Ergonomics',
    'es-MX': 'Periféricos y ergonomía',
    'fr-FR': 'Périphériques & ergonomie',
    'de-DE': 'Peripherie & Ergonomie',
    'pt-BR': 'Periféricos e ergonomia',
    'ja-JP': '周辺機器・エルゴノミクス',
  },
  sub_camera_body: {
    'zh-CN': '相机光学主机',
    'en-US': 'Camera Body & Lenses',
    'es-MX': 'Cuerpo de cámara y lentes',
    'fr-FR': 'Boîtier photo & objectifs',
    'de-DE': 'Kameragehäuse & Objektive',
    'pt-BR': 'Câmera e lentes principais',
    'ja-JP': 'カメラ本体・主力レンズ',
  },
  sub_batteries_sd: {
    'zh-CN': '电池存储与数据备份',
    'en-US': 'Batteries & Storage Media',
    'es-MX': 'Baterías y tarjetas de memoria',
    'fr-FR': 'Batteries & cartes mémoire',
    'de-DE': 'Akkus & Speicherkarten',
    'pt-BR': 'Baterias e cartões de memória',
    'ja-JP': '予備電池・記録メディア',
  },
  sub_optics_support: {
    'zh-CN': '清洁与稳定支撑',
    'en-US': 'Optics Cleaning & Support',
    'es-MX': 'Limpieza óptica y trípode',
    'fr-FR': 'Nettoyage optique & trépied',
    'de-DE': 'Objektivpflege & Stativ',
    'pt-BR': 'Limpeza óptica e tripé',
    'ja-JP': 'メンテナンス・小型三脚',
  },
  sub_formal_attire: {
    'zh-CN': '礼服正装与配饰',
    'en-US': 'Occasion Attire & Jewelry',
    'es-MX': 'Atuendo formal y joyería',
    'fr-FR': 'Tenue de soirée & bijoux',
    'de-DE': 'Festliche Kleidung & Accessoires',
    'pt-BR': 'Traje social e joias',
    'ja-JP': 'ドレス・スーツ・アクセサリー',
  },
  sub_garment_care: {
    'zh-CN': '除皱护理与正装鞋',
    'en-US': 'Garment Care & Dress Shoes',
    'es-MX': 'Cuidado antiarrugas de prendas',
    'fr-FR': 'Soin défroissant des textiles',
    'de-DE': 'Kleidungspflege unterwegs',
    'pt-BR': 'Cuidados antirrugas',
    'ja-JP': 'シワ伸ばし・身だしなみケア',
  },
  sub_return_expansion: {
    'zh-CN': '返程扩容与防碎保护',
    'en-US': 'Return Expansion & Fragile Wrap',
    'es-MX': 'Bolsa extra y protección frágil',
    'fr-FR': 'Extension retour & protection fragile',
    'de-DE': 'Rückflug-Erweiterung & Schutz',
    'pt-BR': 'Expansão de volta e proteção',
    'ja-JP': '帰国用拡張・割れ物保護',
  },
  sub_anti_theft: {
    'zh-CN': '街头防盗与随身便利',
    'en-US': 'Anti-Theft & Daily Convenience',
    'es-MX': 'Antirrobo y practicidad diaria',
    'fr-FR': 'Antivol & praticité urbaine',
    'de-DE': 'Diebstahlschutz & Alltag',
    'pt-BR': 'Antifurto e praticidade diária',
    'ja-JP': '街歩き防犯・便利グッズ',
  },
  sub_weighing_sleep: {
    'zh-CN': '返程称重与长途助眠',
    'en-US': 'Weighing & Flight Comfort',
    'es-MX': 'Pesaje y descanso en vuelo',
    'fr-FR': 'Pesée bagages & confort en vol',
    'de-DE': 'Gepäckwaage & Schlafkomfort',
    'pt-BR': 'Pesagem e conforto no voo',
    'ja-JP': '帰国計量・フライト安眠',
  },
};

export interface PackingSeedDynamicCopy {
  topsCubeLabel: (size: string, cycleDays: number) => string;
  japanPlugLabel: string;
  universalPlugLabel: string;
  adapterItemName: (plugHint: string) => string;
  docVatWhyExtra: string;
  topBaseWhy: (cycleDays: number, size: string) => string;
  topMidWhy: (minTempC: number) => string;
  topDownWhy: (minTempC: number) => string;
  formalCustomWhy: (noteSnippet: string) => string;
}

const DYNAMIC_MAP: LangMap8<PackingSeedDynamicCopy> = {
  'zh-CN': {
    topsCubeLabel: (size, cycleDays) => `压缩收纳袋 M/L · 尺码 ${size} · ${cycleDays}天循环`,
    japanPlugLabel: '日标双扁插头 (Type A)',
    universalPlugLabel: '多国通用转换插头',
    adapterItemName: (plugHint) => `${plugHint}（带多口 USB-C PD 快充）`,
    docVatWhyExtra: '支持当地地铁刷卡与免货币转换费消费，退税入卡更划算',
    topBaseWhy: (cycleDays, size) => `按 ${cycleDays} 天洗护周期配置（尺码 ${size} 克重已校准）`,
    topMidWhy: (minTempC) => `应对早晚与低温站点（最低约 ${minTempC}°C）洋葱式叠穿`,
    topDownWhy: (minTempC) => `途经低温站点（${minTempC}°C）核心锁温层，可收纳成小袋`,
    formalCustomWhy: (note) => `针对「${note}」及高档餐厅着装要求（Dress Code）定制`,
  },
  'en-US': {
    topsCubeLabel: (size, cycleDays) => `Compression cubes M/L · Size ${size} · ${cycleDays}d cycle`,
    japanPlugLabel: 'Japan Type A flat-pin plug',
    universalPlugLabel: 'Universal travel adapter',
    adapterItemName: (plugHint) => `Travel plug adapter (${plugHint}) with multi-port USB-C PD`,
    docVatWhyExtra: 'Zero-FX contactless card for transit tap & VAT tax-free refunds',
    topBaseWhy: (cycleDays, size) => `Scaled for ${cycleDays}-day wash cycle (calibrated for size ${size})`,
    topMidWhy: (minTempC) => `Essential mid-layer for cool mornings & stops down to ${minTempC}°C`,
    topDownWhy: (minTempC) => `High warmth-to-weight insulation for ${minTempC}°C cold stops`,
    formalCustomWhy: (note) => `Tailored for "${note}" and smart-casual/formal dress codes`,
  },
  'es-MX': {
    topsCubeLabel: (size, cycleDays) => `Cubos M/L · Talla ${size} · Ciclo ${cycleDays} días`,
    japanPlugLabel: 'Enchufe plano Japón (Tipo A)',
    universalPlugLabel: 'Adaptador universal de viaje',
    adapterItemName: (plugHint) => `Adaptador (${plugHint}) con puertos USB-C PD`,
    docVatWhyExtra: 'Tarjetas sin comisión FX ideales para transporte y devolución de impuestos',
    topBaseWhy: (cycleDays, size) => `Calculado para ciclo de lavado de ${cycleDays} días (talla ${size})`,
    topMidWhy: (minTempC) => `Capa intermedia ideal para mañanas frescas hasta ${minTempC}°C`,
    topDownWhy: (minTempC) => `Aislamiento ligero de alto abrigo para paradas a ${minTempC}°C`,
    formalCustomWhy: (note) => `Adaptado para "${note}" y códigos de vestimenta formal`,
  },
  'fr-FR': {
    topsCubeLabel: (size, cycleDays) => `Cubes M/L · Taille ${size} · Cycle ${cycleDays} j`,
    japanPlugLabel: 'Prise Japon fiches plates (Type A)',
    universalPlugLabel: 'Adaptateur universel de voyage',
    adapterItemName: (plugHint) => `Adaptateur (${plugHint}) avec USB-C PD multiports`,
    docVatWhyExtra: 'Cartes sans frais pour transports et remboursements détaxe',
    topBaseWhy: (cycleDays, size) => `Adapté au cycle de lavage de ${cycleDays} j (taille ${size})`,
    topMidWhy: (minTempC) => `Couche intermédiaire pour matins frais jusqu’à ${minTempC}°C`,
    topDownWhy: (minTempC) => `Isolation légère compressible pour étapes à ${minTempC}°C`,
    formalCustomWhy: (note) => `Adapté à « ${note} » et aux codes vestimentaires habillés`,
  },
  'de-DE': {
    topsCubeLabel: (size, cycleDays) => `Kompressionsbeutel M/L · Gr. ${size} · ${cycleDays}-Tage-Zyklus`,
    japanPlugLabel: 'Japan-Flachstecker (Typ A)',
    universalPlugLabel: 'Universal-Reiseadapter',
    adapterItemName: (plugHint) => `Reiseadapter (${plugHint}) mit USB-C-PD-Schnellladung`,
    docVatWhyExtra: 'Karten ohne Fremdwährungsgebühr für ÖPNV und Tax-Free-Erstattung',
    topBaseWhy: (cycleDays, size) => `Abgestimmt auf ${cycleDays}-Tage-Waschzyklus (Größe ${size})`,
    topMidWhy: (minTempC) => `Wichtige Zwischenschicht für kühle Morgen bis ${minTempC}°C`,
    topDownWhy: (minTempC) => `Leichte Wärmeisolierung für kalte Stopps bis ${minTempC}°C`,
    formalCustomWhy: (note) => `Abgestimmt auf „${note}“ und gehobene Dresscodes`,
  },
  'pt-BR': {
    topsCubeLabel: (size, cycleDays) => `Cubos M/L · Tam. ${size} · Ciclo ${cycleDays}d`,
    japanPlugLabel: 'Tomada Japão pinos chatos (Tipo A)',
    universalPlugLabel: 'Adaptador universal de viagem',
    adapterItemName: (plugHint) => `Adaptador (${plugHint}) com carregamento USB-C PD`,
    docVatWhyExtra: 'Cartões sem taxa FX para transporte e reembolso de impostos',
    topBaseWhy: (cycleDays, size) => `Calculado para ciclo de lavagem de ${cycleDays} dias (tam. ${size})`,
    topMidWhy: (minTempC) => `Camada intermediária essencial para manhãs frias até ${minTempC}°C`,
    topDownWhy: (minTempC) => `Isolamento leve e compacto para paradas frias de até ${minTempC}°C`,
    formalCustomWhy: (note) => `Ajustado para "${note}" e exigências de traje social`,
  },
  'ja-JP': {
    topsCubeLabel: (size, cycleDays) => `圧縮ポーチ M/L · サイズ ${size} · ${cycleDays}日サイクル`,
    japanPlugLabel: '日本国内用Aタイププラグ',
    universalPlugLabel: '全世界対応マルチ変換プラグ',
    adapterItemName: (plugHint) => `${plugHint}（USB-C PD 複数ポート急速充電）`,
    docVatWhyExtra: '現地交通タッチ決済と免税返金手続きに対応',
    topBaseWhy: (cycleDays, size) => `${cycleDays}日間の洗濯サイクル基準（サイズ ${size} で重量補正済）`,
    topMidWhy: (minTempC) => `朝晩や最低気温 ${minTempC}°C 前後の寒冷地に必須の重ね着`,
    topDownWhy: (minTempC) => `気温 ${minTempC}°C 帯向けの軽量・コンパクト高保温アウター`,
    formalCustomWhy: (note) => `「${note}」や高級レストランのドレスコードに合わせた装い`,
  },
};

export function getPackingGroupCopy(key: PackingGroupCopyKey, lang: AppLanguage): { title: string; cubeLabel: string } {
  return pickLang(lang, GROUP_MAP[key]);
}

export function getPackingSubCategory(key: PackingSubCategoryKey, lang: AppLanguage): string {
  return pickLang(lang, SUBCAT_MAP[key]);
}

export function getPackingSeedDynamicCopy(lang: AppLanguage): PackingSeedDynamicCopy {
  return pickLang(lang, DYNAMIC_MAP);
}
