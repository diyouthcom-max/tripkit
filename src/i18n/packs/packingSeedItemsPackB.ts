import type { AppLanguage } from '../../types';
import { pickLang, type LangMap8 } from '../langHelper';

export type PackingSeedItemKeyB =
  | 'med_fever'
  | 'med_stomach'
  | 'med_allergy'
  | 'med_blister'
  | 'med_rx_pills'
  | 'med_rx_note'
  | 'water_swimwear'
  | 'water_drybag'
  | 'water_phone_pouch'
  | 'water_sunscreen'
  | 'water_reef_shoes'
  | 'water_goggles'
  | 'onsen_caddy'
  | 'onsen_cover'
  | 'ski_gloves_socks'
  | 'ski_goggles_cleats'
  | 'ski_warmers'
  | 'hike_shoes'
  | 'hike_daypack'
  | 'hike_safety'
  | 'hike_camp_light'
  | 'park_ponchos'
  | 'park_cushion'
  | 'fit_apparel'
  | 'fit_bands'
  | 'baby_diapers'
  | 'baby_warmer'
  | 'baby_stroller'
  | 'kids_wipes_safety'
  | 'kids_meds'
  | 'work_laptop'
  | 'work_gan'
  | 'work_mouse_hub'
  | 'work_stand'
  | 'photo_camera'
  | 'photo_batteries'
  | 'photo_sd'
  | 'photo_tripod'
  | 'formal_women'
  | 'formal_men'
  | 'formal_spray'
  | 'shop_duffle'
  | 'shop_bubble'
  | 'extra_tether'
  | 'extra_scale'
  | 'extra_sleepkit';

const SEED_ITEMS_B: Record<PackingSeedItemKeyB, LangMap8<[string, string]>> = {
  med_fever: {
    'zh-CN': ['退烧止痛药（布洛芬/对乙酰氨基酚）+ 综合感冒药', '应对跨温区着凉与突发头疼发热，全队共用一份即可'],
    'en-US': ['Pain/fever relief (Ibuprofen/Paracetamol) & cold meds', 'Fast relief for travel fever or headaches without hunting night pharmacies'],
    'es-MX': ['Analgésico/antipirético (ibuprofeno/paracetamol) y antigripal', 'Alivio rápido ante fiebre o dolor sin buscar farmacias de noche'],
    'fr-FR': ['Antalgique/fièvre (ibuprofène/paracétamol) & rhume', 'Soulagement rapide sans chercher de pharmacie de garde'],
    'de-DE': ['Schmerz-/Fiebermittel (Ibuprofen/Paracetamol) & Erkältungsmittel', 'Schnelle Hilfe bei Kopfschmerzen oder Fieber unterwegs'],
    'pt-BR': ['Analgésico/antitérmico (ibuprofeno/paracetamol) e antigripal', 'Alívio rápido para febre ou dor sem procurar farmácia de madrugada'],
    'ja-JP': ['解熱鎮痛剤（イブプロフェン等）＋総合風邪薬', '寒暖差による発熱や急な頭痛にすぐ対応できる常備薬'],
  },
  med_stomach: {
    'zh-CN': ['肠胃止泻药 / 蒙脱石散 + 电解质冲剂/益生菌', '生冷海鲜刺身或异国饮食水土不服应急'],
    'en-US': ['Stomach / anti-diarrheal meds & electrolyte packets', 'Essential backup for sashimi, street food, and water changes'],
    'es-MX': ['Antidiarreico, medicamento estomacal y suero en sobres', 'Respaldo clave ante comida callejera o cambio de agua'],
    'fr-FR': ['Antidiarrhéique, maux d’estomac & sachets d’électrolytes', 'Indispensable en cas d’intolérance alimentaire ou street food'],
    'de-DE': ['Magen-Darm-Mittel & Elektrolytpulver', 'Wichtig bei ungewohntem Essen, Streetfood oder Wasserwechsel'],
    'pt-BR': ['Antidiarreico, remédio estomacal e sais hidratantes', 'Garantia essencial para comida de rua e mudança de água'],
    'ja-JP': ['胃腸薬・下痢止め＋経口補水パウダー・整腸剤', '生ものや海外の食事・水質の違いによる腹痛対策に'],
  },
  med_allergy: {
    'zh-CN': ['抗过敏药（氯雷他定）+ 晕车晕船贴', '海鲜花粉过敏或乘船出海、盘山巴士防晕应急'],
    'en-US': ['Antihistamine allergy tablets & motion sickness patches', 'Prevents allergic reactions and ferry/mountain bus motion sickness'],
    'es-MX': ['Antihistamínico y parches o pastillas para mareo', 'Previene alergias y mareos en ferry, avión o carreteras de montaña'],
    'fr-FR': ['Antihistaminique & patchs contre le mal des transports', 'Prévient allergies et nausées en bateau ou car de montagne'],
    'de-DE': ['Antihistaminikum & Pflaster gegen Reiseübelkeit', 'Hilft bei Allergien sowie auf Fähren und Bergstraßen'],
    'pt-BR': ['Antialérgico e adesivos/remédio para enjoo', 'Previne alergias e enjoos em barcos, voos e estradas sinuosas'],
    'ja-JP': ['アレルギー薬＋酔い止め薬・酔い止めパッチ', '花粉や食事アレルギー、フェリーや山道のバス酔い対策に'],
  },
  med_blister: {
    'zh-CN': ['水胶体防磨水泡贴 + 防水创可贴 + 独立酒精棉片', '日均两万步救星，防止脚后跟磨破影响后续行程'],
    'en-US': ['Hydrocolloid blister plasters, band-aids & antiseptic wipes', 'Saves walking days from new-shoe or cobblestone blisters'],
    'es-MX': ['Parches hidrocoloides para ampollas, curitas y toallitas', 'Salvan tus caminatas si rozan los zapatos en calles empedradas'],
    'fr-FR': ['Pansements hydrocolloïdes anti-ampoules & lingettes antiseptiques', 'Indispensable pour continuer à marcher sans douleur'],
    'de-DE': ['Hydrokolloid-Blasenpflaster, Pflaster & Alkoholtupfer', 'Rettet lange Gehtage bei Druckstellen oder Blasen'],
    'pt-BR': ['Curativos hidrocoloides para bolhas e lenços antissépticos', 'Salva as caminhadas contra atrito em calçadas de pedra'],
    'ja-JP': ['ハイドロコロイド靴擦れパッド＋防水絆創膏＋消毒綿', '1日2万歩以上の観光でもかかとの靴擦れ悪化を防止'],
  },
  med_rx_pills: {
    'zh-CN': ['个人每日规律处方药（按行程天数 + 3天冗余装随身包）', '处方药务必全程随身携带防托运延误，保留原包装盒备海关查验'],
    'en-US': ['Daily prescription medications (+3 extra days buffer in cabin)', 'Keep in original labeled packaging in carry-on in case of flight delays'],
    'es-MX': ['Medicación recetada diaria (+3 días extra en cabina)', 'Llévala siempre en cabina y con su caja original por retrasos o aduana'],
    'fr-FR': ['Traitements quotidiens (+3 jours de marge en cabine)', 'À garder dans l’emballage d’origine en cabine en cas de retard'],
    'de-DE': ['Tägliche verschreibungspflichtige Medikamente (+3 Tage Puffer)', 'In Originalverpackung ins Handgepäck für Flugverspätungen'],
    'pt-BR': ['Medicação de uso contínuo (+3 dias extras na cabine)', 'Mantenha na embalagem original na bagagem de mão'],
    'ja-JP': ['毎日の処方薬（旅行日数＋3日分を機内持ち込み）', 'ロストバゲージ対策と税関確認のため元の包装のまま手荷物へ'],
  },
  med_rx_note: {
    'zh-CN': ['英文处方笺 / 医生诊断证明电子版 (0g)', '跨国携带常备处方药过海关安心备查'],
    'en-US': ['Doctor prescription note PDF (0g digital copy)', 'Smooth customs clearance for personal prescription medicines'],
    'es-MX': ['Receta médica o certificado digital PDF (0 g)', 'Facilita la revisión aduanera de tus medicamentos personales'],
    'fr-FR': ['Ordonnance médicale traduite en PDF (0 g)', 'Facilite les contrôles douaniers pour vos médicaments'],
    'de-DE': ['Ärztliches Rezept / Attest auf Englisch (0g-PDF)', 'Problemlose Zollkontrolle bei persönlichen Medikamenten'],
    'pt-BR': ['Receita médica / laudo traduzido em PDF (0 g)', 'Evita contratempos na alfândega com remédios controlados'],
    'ja-JP': ['英文処方箋・診断書PDF控え (0g)', '海外の税関検査時に個人用医薬品であることをスムーズに証明'],
  },
  water_swimwear: {
    'zh-CN': ['速干泳衣 / 泳裤 + 防走光罩衫/沙滩裤', '海滨戏水、酒店无边泳池或浮潜核心装备'],
    'en-US': ['Quick-dry swimwear & beach cover-up / boardshorts', 'Essential for beach swims, hotel pools, and boat excursions'],
    'es-MX': ['Traje de baño de secado rápido y salida de playa', 'Esencial para playa, alberca del hotel o paseos en lancha'],
    'fr-FR': ['Maillot de bain séchage rapide & paréo / short', 'Indispensable pour plage, piscine et sorties en bateau'],
    'de-DE': ['Schnelltrocknende Badekleidung & Strandüberwurf', 'Für Strand, Hotelpool und Bootsausflüge'],
    'pt-BR': ['Roupa de banho dry-fit e saída de praia', 'Essencial para praia, piscina do hotel e passeios de barco'],
    'ja-JP': ['速乾水着＋ラッシュガード・ビーチ羽織', 'ビーチ、ホテルのプール、シュノーケルツアーに必携'],
  },
  water_drybag: {
    'zh-CN': ['卷口干湿分离防水袋 + 超细纤维速干沙滩巾', '比普通浴巾轻 70% 且一抖去沙，湿泳衣独立密封不弄湿箱包'],
    'en-US': ['Roll-top wet/dry bag & sand-free microfiber beach towel', 'Shakes off sand easily and isolates wet swimwear on transfer days'],
    'es-MX': ['Bolsa seca enrollable y toalla microfibra antiarena', 'Sacude la arena fácil y aísla la ropa mojada al cambiar de hotel'],
    'fr-FR': ['Sac étanche à enroulement & serviette microfibre', 'N’accroche pas le sable et isole le maillot mouillé dans le sac'],
    'de-DE': ['Rolltop-Trockensack & Mikrofaser-Strandtuch', 'Lässt sich leicht ausschütteln und trennt nasse Badesachen'],
    'pt-BR': ['Saco estanque dobrável e toalha de microfibra', 'Não gruda areia e isola o traje molhado dentro da mala'],
    'ja-JP': ['ロールトップ防水バッグ＋速乾マイクロファイバータオル', '砂が落ちやすく超軽量。濡れた水着を密閉して持ち運び可能'],
  },
  water_phone_pouch: {
    'zh-CN': ['IPX8 触屏手机防水袋（附浮力挂绳）', '海边踏浪、浮潜与泳池跟拍防手机进水沉底'],
    'en-US': ['IPX8 floating waterproof phone pouch', 'Keeps phone dry and buoyant while filming in water'],
    'es-MX': ['Funda impermeable flotante IPX8 para celular', 'Mantiene tu teléfono seco y a flote al grabar en el agua'],
    'fr-FR': ['Pochette étanche flottante IPX8 pour téléphone', 'Protège votre téléphone de l’eau tout en filmant'],
    'de-DE': ['Schwimmende IPX8-Handyhülle', 'Hält das Smartphone im Wasser trocken und sicher an der Oberfläche'],
    'pt-BR': ['Capa à prova d’água flutuante IPX8 para celular', 'Mantém o celular seco e flutuando ao filmar na água'],
    'ja-JP': ['IPX8浮力付きスマホ防水ケース', '海やプールでの写真撮影時の水没・落下を防止'],
  },
  water_sunscreen: {
    'zh-CN': ['海洋珊瑚友好型防水防晒霜 SPF50+ + 晒后芦荟舒缓冻胶', '海面紫外线反射极强（保护海域推荐珊瑚友好配方）'],
    'en-US': ['Reef-safe water-resistant SPF50+ sunscreen & after-sun aloe gel', 'Protects against intense water UV reflection and cools sun-kissed skin'],
    'es-MX': ['Bloqueador resistente al agua Reef-Safe FPS50+ y gel de aloe', 'Protege del intenso reflejo solar marino y calma la piel'],
    'fr-FR': ['Crème solaire Reef-Safe SPF50+ & gel d’aloe après-soleil', 'Protège contre la réverbération marine et apaise la peau'],
    'de-DE': ['Wasserfester, korallenfreundlicher LSF50+ & Aloe-Vera-Gel', 'Schützt vor starker UV-Reflexion auf dem Wasser'],
    'pt-BR': ['Protetor resistente à água Reef-Safe FPS50+ e gel pós-sol', 'Protege do reflexo solar intenso e acalma a pele após a praia'],
    'ja-JP': ['リーフセーフ防水日焼け止め SPF50+＋アフターサンジェル', '海面の強い照り返し対策（サンゴに優しい処方推奨）'],
  },
  water_reef_shoes: {
    'zh-CN': ['防割防滑涉水沙滩袜 / 浮潜呼吸管面镜轻便装', '防止礁石珊瑚划伤脚底，浮潜看鱼更清晰卫生'],
    'en-US': ['Reef water shoes / anti-fog swim goggles', 'Protects feet on rocky/coral shores and improves underwater visibility'],
    'es-MX': ['Zapatos acuáticos / visor de esnórquel', 'Protege los pies en rocas o coral y mejora la vista bajo el agua'],
    'fr-FR': ['Chaussures d’eau / masque de plongée antibuée', 'Protège les pieds sur rochers/coraux et offre une vue nette'],
    'de-DE': ['Badeschuhe / beschlagfreie Schwimmbrille', 'Schützt die Füße auf Steinen/Korallen und sorgt für klare Sicht'],
    'pt-BR': ['Sapatilha aquática / óculos ou snorkel pessoal', 'Protege os pés em pedras/corais com mais higiene e visibilidade'],
    'ja-JP': ['マリンシューズ・マイ水中ゴーグル', '岩場やサンゴからの怪我を防ぎ、シュノーケルも清潔に'],
  },
  water_goggles: {
    'zh-CN': ['防雾高清泳镜 + 硅胶防水泳帽 + 防水耳塞', '许多酒店与市政标准泳池强制要求佩戴泳帽入池'],
    'en-US': ['Anti-fog swim goggles, silicone swim cap & waterproof earplugs', 'Many hotel and lap pools require a swim cap for entry'],
    'es-MX': ['Goggles antiempañantes, gorra de silicona y tapones', 'Muchas albercas de hotel o municipales exigen gorra obligatoria'],
    'fr-FR': ['Lunettes antibuée, bonnet de bain silicone & bouchons', 'De nombreuses piscines imposent le port du bonnet de bain'],
    'de-DE': ['Anti-Beschlag-Schwimmbrille, Badekappe & Ohrstöpsel', 'In vielen Sport- und Hotelbecken gilt Badekappenpflicht'],
    'pt-BR': ['Óculos antiembaçante, touca de silicone e protetor auricular', 'Várias piscinas exigem touca obrigatória para entrar na água'],
    'ja-JP': ['曇り止めスイムゴーグル＋シリコンキャップ＋耳栓', 'ホテルや公営プールでは水泳帽着用必須の施設が多いため安心'],
  },
  onsen_caddy: {
    'zh-CN': ['束发皮筋/鲨鱼夹 + 温泉防水小提篮袋 + 零钱袋', '日式温泉长发须盘起不入池，更衣室储物柜与贩卖机常需硬币'],
    'en-US': ['Hair ties/claw clip, mesh spa caddy & coin pouch', 'Long hair must be tied up in onsen; coins needed for bath lockers'],
    'es-MX': ['Ligas para cabello, bolsa de malla y monedero', 'En baños termales el cabello va recogido y los casilleros usan monedas'],
    'fr-FR': ['Élastiques/pince cheveux, sac filet & porte-monnaie', 'Cheveux attachés obligatoires en onsen ; pièces utiles pour casiers'],
    'de-DE': ['Haargummis/Klammer, Netz-Badetasche & Münzbeutel', 'Lange Haare im Onsen hochstecken; Münzen für Schließfächer'],
    'pt-BR': ['Prendedor de cabelo, bolsa telada e porta-moedas', 'Cabelo preso é regra no onsen e armários costumam exigir moedas'],
    'ja-JP': ['ヘアゴム・クリップ＋メッシュ湯かご＋100円玉用小銭入れ', '温泉では長い髪を結ぶのがマナー。脱衣所ロッカー用硬貨も必須'],
  },
  onsen_cover: {
    'zh-CN': ['肤色防水纹身遮瑕贴（如有纹身）+ 泡汤后高保湿身体乳', '传统公共汤池对纹身敏感可提前贴遮瑕贴；泡后及时保湿防干痒'],
    'en-US': ['Waterproof tattoo cover-up tape (if needed) & rich body lotion', 'Traditional public baths restrict visible tattoos; mineral water dries skin'],
    'es-MX': ['Parches cubre-tatuajes impermeables y crema corporal hidratante', 'Muchos baños tradicionales restringen tatuajes; hidrata tras agua mineral'],
    'fr-FR': ['Patchs cache-tatouage étanches & lait corps nourrissant', 'Certains bains publics exigent de couvrir les tatouages ; hydrate après'],
    'de-DE': ['Wasserfeste Tattoo-Pflaster (falls nötig) & Bodylotion', 'Viele traditionelle Bäder verlangen Abdeckung; Mineralwasser trocknet aus'],
    'pt-BR': ['Adesivo impermeável cobre-tatuagem e hidratante corporal', 'Banhos tradicionais pedem cobertura; hidrate bem após água termal'],
    'ja-JP': ['防水タトゥー隠しシール＋入浴後高保湿ボディクリーム', '大浴場の利用規約対策と、硫黄泉・温泉後の乾燥・かゆみ予防に'],
  },
  ski_gloves_socks: {
    'zh-CN': ['防水透气滑雪手套 + 抓绒护脸面罩 + 美利奴滑雪袜 ×2', '雪板雪服可租，贴身护脸、手套与长筒滑雪袜自备更卫生保暖'],
    'en-US': ['Waterproof ski gloves, fleece balaclava & merino ski socks ×2', 'Skis/jackets can be rented, but personal gloves & ski socks stay warmer'],
    'es-MX': ['Guantes impermeables, pasamontañas y 2 pares calceta merino', 'Puedes rentar equipo, pero guantes y calcetas propias son más cálidos'],
    'fr-FR': ['Gants ski étanches, cagoule polaire & 2 paires chaussettes mérinos', 'Louez les skis, mais gardez gants et chaussettes perso pour la chaleur'],
    'de-DE': ['Wasserdichte Skihandschuhe, Sturmhaube & 2 Paar Merino-Skisocken', 'Ski lassen sich leihen, eigene Handschuhe & Socken wärmen besser'],
    'pt-BR': ['Luvas de esqui impermeáveis, balaclava e 2 meias merino', 'Alugue esquis lá, mas luvas e meias próprias garantem higiene e calor'],
    'ja-JP': ['防水スキーグローブ＋バラクラバ＋メリノスキー靴下×2', 'ウェアや板は現地レンタル可。肌に触れる小物と靴下は持参が快適'],
  },
  ski_goggles_cleats: {
    'zh-CN': ['双层防雾滑雪护目镜 + 冰爪防滑鞋套', '雪地结冰路面极滑，便携冰爪套在日常鞋上防摔倒；防雪盲护目'],
    'en-US': ['Anti-fog snow goggles & slip-on ice cleats for icy streets', 'Prevents snow blindness on slopes and slips on icy resort sidewalks'],
    'es-MX': ['Antiparras antiempañantes y crampones urbanos para hielo', 'Evita ceguera por nieve en pista y resbalones en aceras congeladas'],
    'fr-FR': ['Masque de ski antibuée & crampons antidérapants urbains', 'Protège de l’éblouissement sur piste et des trottoirs verglacés'],
    'de-DE': ['Beschlagfreie Skibrille & Schuh-Spikes für Eiswege', 'Schützt vor Schneeblindheit und Stürzen auf vereisten Gehwegen'],
    'pt-BR': ['Óculos de neve antiembaçante e travas de gelo para calçados', 'Evita ofuscamento na pista e escorregões em calçadas congeladas'],
    'ja-JP': ['ダブルレンズ曇り止めゴーグル＋携帯滑り止めアイゼン', 'ゲレンデの雪目対策と、凍結した雪国の歩道での転倒防止に'],
  },
  ski_warmers: {
    'zh-CN': ['随身暖宝宝贴 ×10 + 手机防冻保暖贴', '零下户外防止手指僵硬及手机低温自动关机'],
    'en-US': ['Pocket hand/foot warmers ×10', 'Keeps fingers warm and stops phone battery from shutting down in sub-zero cold'],
    'es-MX': ['10 calentadores desechables de manos y pies', 'Mantiene dedos calientes y evita que el celular se apague por el frío'],
    'fr-FR': ['10 chaufferettes mains et pieds', 'Garde les doigts au chaud et évite la coupure batterie par grand froid'],
    'de-DE': ['10 Hand- & Fußwärmer-Pads', 'Hält Finger warm und schützt Handys vor Kälte-Abschaltung'],
    'pt-BR': ['10 aquecedores descartáveis para mãos e pés', 'Aquece os dedos e evita que a bateria do celular desligue no frio'],
    'ja-JP': ['使い捨てカイロ（貼る・貼らない）×10', '氷点下での手足の冷え対策とスマホバッテリーの急落防止に'],
  },
  hike_shoes: {
    'zh-CN': ['抓地防滑越野徒步鞋 + 加厚登山袜 ×2', '碎石泥泞步道防滑护踝'],
    'en-US': ['Grip trail hiking shoes & cushioned merino trail socks ×2', 'Ankle support and wet-rock traction on mountain trails'],
    'es-MX': ['Tenis o botas de senderismo + 2 calcetas acolchadas', 'Tracción firme en grava/roca mojada y soporte en montaña'],
    'fr-FR': ['Chaussures trail adhérentes & 2 paires chaussettes rando', 'Accroche sur roche humide et maintien de la cheville'],
    'de-DE': ['Griffige Wanderschuhe & 2 Paar gepolsterte Trekkingsocken', 'Halt auf Geröll und nassem Fels im Gebirge'],
    'pt-BR': ['Tênis ou bota de trilha aderente + 2 meias acolchoadas', 'Tração segura em pedras molhadas e proteção para o tornozelo'],
    'ja-JP': ['グリップ力の高いトレッキングシューズ＋厚手登山靴下×2', '砂利道や濡れた岩場でも滑りにくく足首を保護'],
  },
  hike_daypack: {
    'zh-CN': ['可折叠轻量攻顶包 (20L) + 轻量保温水壶 + 防水背包罩', '山野步道补水与收纳防风层（过机场安检前排空水壶）'],
    'en-US': ['Packable 20L daypack, insulated bottle & rain pack cover', 'Trail hydration & layer storage (empty bottle before airport security)'],
    'es-MX': ['Mochila plegable 20 L, termo y funda impermeable', 'Hidratación en ruta y capas (vacía el termo antes de seguridad)'],
    'fr-FR': ['Sac à dos 20 L pliable, gourde isotherme & housse pluie', 'Hydratation et coupe-vent (vider la gourde avant les contrôles)'],
    'de-DE': ['Faltbarer 20-L-Tagesrucksack, Isolierflasche & Regenhülle', 'Verpflegung & Schichtwechsel (Flasche vor Security leeren)'],
    'pt-BR': ['Mochila dobrável 20 L, garrafa térmica e capa de chuva', 'Hidratação na trilha (esvazie a garrafa antes do raio-X)'],
    'ja-JP': ['折りたたみ20Lアタックザック＋保温ボトル＋ザックカバー', 'トレッキング中の水分補給と上着収納（保安検査時は空に）'],
  },
  hike_safety: {
    'zh-CN': ['高能量盐丸/能量胶 + 急救保温太空毯 + 驱蚊喷雾', '长距离徒步防抽筋与高山突变天气应急保温'],
    'en-US': ['Electrolyte chews, emergency mylar blanket & insect repellent', 'Quick trail energy, bug protection, and emergency alpine warmth'],
    'es-MX': ['Geles/electrolitos, manta térmica de emergencia y repelente', 'Energía rápida contra calambres, mosquitos y clima cambiante'],
    'fr-FR': ['Gels/électrolytes, couverture de survie & répulsif insectes', 'Énergie rapide, protection insectes et chaleur d’urgence'],
    'de-DE': ['Elektrolyt-Gels, Rettungsdecke & Insektenschutz', 'Schnelle Energie, Mückenschutz und Notfallwärme am Berg'],
    'pt-BR': ['Géis de energia, manta térmica de emergência e repelente', 'Reposição rápida de sais, proteção contra insetos e frio'],
    'ja-JP': ['塩分タブレット・行動食＋エマージェンシーシート＋虫除け', '長距離歩行の足つり防止と山の天候急変時の緊急保温'],
  },
  hike_camp_light: {
    'zh-CN': ['Type-C 充电超轻头灯 + 便携折叠野餐防潮垫', '营地夜间解放双手照明（锂电头灯请随身登机）与草地防潮'],
    'en-US': ['USB-C rechargeable headlamp & pocket waterproof ground mat', 'Hands-free camp/dusk lighting (cabin-safe battery) and dry seating outdoors'],
    'es-MX': ['Linterna frontal USB-C y tapete impermeable plegable', 'Iluminación manos libres de noche (lleva la batería en cabina)'],
    'fr-FR': ['Lampe frontale USB-C & tapis imperméable de poche', 'Éclairage mains libres au camp (batterie en cabine) et assise sèche'],
    'de-DE': ['USB-C-Stirnlampe & faltbare wasserdichte Sitzmatte', 'Freihand-Licht am Abend (Akku ins Handgepäck) & trockener Sitz'],
    'pt-BR': ['Lanterna de cabeça USB-C e tapete impermeável de bolso', 'Iluminação mãos livres à noite (bateria na cabine) e assento seco'],
    'ja-JP': ['USB-C充電ヘッドライト＋携帯防水ピクニックシート', '夜のテント場で両手自由（リチウム電池式は機内持ち込み）'],
  },
  park_ponchos: {
    'zh-CN': ['加厚便携一次性雨衣 ×2 + 防水鞋套', '激流勇进/水上项目与突发阵雨免排高价雨衣队，玩完即收不湿鞋'],
    'en-US': ['Thick reusable rain ponchos ×2 & waterproof shoe covers', 'Saves money on water rides and sudden park downpours'],
    'es-MX': ['2 ponchos de lluvia reutilizables y cubrecalzado impermeable', 'Ahorra filas y dinero en atracciones acuáticas o lluvias súbitas'],
    'fr-FR': ['2 ponchos pluie réutilisables & surchaussures étanches', 'Évite de payer cher sur place pour les attractions d’eau'],
    'de-DE': ['2 stabile Regenponchos & wasserdichte Schuhüberzieher', 'Spart Geld bei Wasserbahnen und plötzlichen Schauern im Park'],
    'pt-BR': ['2 capas de chuva reforçadas e protetor impermeável de tênis', 'Economiza em atrações molhadas e chuvas rápidas no parque'],
    'ja-JP': ['厚手携帯レインポンチョ×2＋防水シューズカバー', 'ウォーターアトラクションや急な雨で靴を濡らさず行列も回避'],
  },
  park_cushion: {
    'zh-CN': ['超轻折叠排队小坐垫 + 休足时间清凉舒缓足贴', '看花车烟花席地而坐隔凉隔湿，回酒店贴足贴次日满血复活'],
    'en-US': ['Ultralight foam sit pad & cooling foot relief patches', 'Dry cushion for parade/fireworks waiting + overnight relief after 25,000 steps'],
    'es-MX': ['Cojín plegable ultraligero y parches refrescantes para pies', 'Para sentarse cómodo en desfiles y aliviar los pies tras 25,000 pasos'],
    'fr-FR': ['Coussin pliable ultraléger & patchs rafraîchissants pieds', 'Assise sèche pour la parade et récupération après 25 000 pas'],
    'de-DE': ['Ultraleichtes Falt-Sitzkissen & kühlende Fußpflaster', 'Trockenes Sitzen bei Paraden + Erholung nach 25.000 Schritten'],
    'pt-BR': ['Almofada dobrável ultraleve e adesivos refrescantes para pés', 'Conforto no chão para shows e alívio noturno após muito andar'],
    'ja-JP': ['超軽量折りたたみクッション＋休息シート（足用冷却シート）', 'パレード待ちの地面冷え防止と、1日2万歩後の夜の足ケアに'],
  },
  fit_apparel: {
    'zh-CN': ['高排汗速干运动短袖 + 运动短裤/紧身裤套装', '酒店健身房或城市河畔晨跑专用，洗后数小时即干'],
    'en-US': ['Moisture-wicking workout top & running shorts/leggings', 'Dedicated sweat-wicking set for hotel gym sessions and city morning runs'],
    'es-MX': ['Conjunto deportivo dry-fit (playera y short/leggings)', 'Ideal para gimnasio del hotel o trotar en la mañana; seca rápido'],
    'fr-FR': ['Ensemble sport respirant (haut & short/legging)', 'Idéal pour la salle de l’hôtel ou le footing matinal'],
    'de-DE': ['Funktions-Sportshirt & Laufshorts/-leggings', 'Perfekt fürs Hotel-Gym oder die Morgenrunde durch die Stadt'],
    'pt-BR': ['Conjunto dry-fit (camiseta e short/legging)', 'Para academia do hotel ou corrida matinal; seca em poucas horas'],
    'ja-JP': ['吸汗速乾トレーニングTシャツ＋ランニングパンツ', 'ホテルジムや旅先での朝ラン専用。洗って数時間で乾きます'],
  },
  fit_bands: {
    'zh-CN': ['超轻运动导汗发带 + 轻便阻力训练弹力带', '仅重 80g 即可在酒店客房完成热身拉伸与力量激活'],
    'en-US': ['Sweat headband & ultralight resistance loop bands', 'Zero-bulk room workout and post-flight mobility stretching'],
    'es-MX': ['Banda para sudor y ligas de resistencia ultraligeras', 'Entrenamiento y estiramiento completo en la habitación con 85 g'],
    'fr-FR': ['Bandeau anti-transpiration & élastiques de résistance', 'Renforcement et étirements après-vol sans encombrement'],
    'de-DE': ['Schweißband & ultraleichte Widerstandsbänder', 'Kompaktes Zimmer-Workout und Dehnen nach langen Flügen'],
    'pt-BR': ['Faixa de treino e elásticos de resistência ultraleves', 'Treino completo e alongamento pós-voo direto no quarto'],
    'ja-JP': ['スポーツヘアバンド＋携帯トレーニングチューブ', 'わずか85gでホテルの客室でも全身ストレッチと筋トレが可能'],
  },
  baby_diapers: {
    'zh-CN': ['婴儿纸尿裤（随身够飞程+48h量，大包当地超市补给）', '防航班延误断档，大包装到达目的地采购更省箱位'],
    'en-US': ['Baby diapers / nappies (flight + 48h supply in cabin)', 'Covers transit + first 48h; buy bulk packs locally to save space'],
    'en-GB': ['Baby nappies (flight + 48h supply in cabin)', 'Covers transit + first 48h; buy bulk packs locally to save space'],
    'es-MX': ['Pañales (suficientes para vuelo + 48 h en cabina)', 'Cubre retrasos y primeros días; compra paquetes grandes al llegar'],
    'fr-FR': ['Couches bébé (pour le vol + 48 h en cabine)', 'Couvre le trajet et les imprévus ; achetez le reste sur place'],
    'de-DE': ['Babywindeln (Flug + 48 Std. Vorrat im Handgepäck)', 'Deckt Verspätungen ab; Großpackungen vor Ort nachkaufen'],
    'pt-BR': ['Fraldas descartáveis (voo + 48 h na cabine)', 'Garante os primeiros dias; compre pacotes grandes no destino'],
    'ja-JP': ['紙おむつ（移動中＋到着後48時間分を機内持ち込み）', '遅延対策。大容量パックは現地のドラッグストア等で調達すると省スペース'],
  },
  baby_warmer: {
    'zh-CN': ['便携恒温调奶器 / 保温杯 + 分格奶粉盒', '机场与机舱随时冲泡适温奶（婴儿液态奶/水过安检可申报豁免）'],
    'en-US': ['Portable bottle warmer / insulated flask & formula dispenser', 'Instant warm feeds on flights; baby milk/water is security-exempt'],
    'es-MX': ['Termo / calentador portátil y dosificador de fórmula', 'Prepara leche en el vuelo (agua/leche de bebé exenta en seguridad)'],
    'fr-FR': ['Bouteille isotherme / chauffe-biberon & boîte doseuse', 'Préparation rapide en vol (lait/eau bébé autorisés au contrôle)'],
    'de-DE': ['Isolierflasche / Flaschenwärmer & Milchpulver-Portionierer', 'Schnelles Füttern im Flug (Babynahrung von Flüssigkeitsgrenze befreit)'],
    'pt-BR': ['Garrafa térmica / aquecedor portátil e porta-fórmula', 'Mamadeira na hora no voo (água e leite de bebê são isentos no raio-X)'],
    'ja-JP': ['携帯調乳用保温ボトル＋粉ミルク小分けケース', '空港や機内でもすぐ調乳可（ベビー用飲料・ミルクは検査除外申請可）'],
  },
  baby_stroller: {
    'zh-CN': ['可登机一键折叠婴儿车 / 省力腰凳背带', '石板路与无电梯地铁站背带更灵活，机舱口可直接交接婴儿车'],
    'en-US': ['Cabin-foldable travel stroller / ergonomic baby carrier', 'Gate-checkable stroller + hands-free carrier for stairs/trains'],
    'es-MX': ['Carriola compacta de cabina / portabebés ergonómico', 'Práctico para escaleras y metro; carriola entregable en puerta'],
    'fr-FR': ['Poussette compacte cabine / porte-bébé ergonomique', 'Pratique dans les escaliers et métros ; poussette remise à la porte'],
    'de-DE': ['Kabinen-Buggy / ergonomische Babytrage', 'Flexibel auf Treppen und Kopfsteinpflaster; Buggy oft handgepäcktauglich'],
    'pt-BR': ['Carrinho compacto de cabine / canguru ergonômico', 'Ágil em escadas e metrôs; carrinho pode ser despachado no portão'],
    'ja-JP': ['機内持ち込み対応折りたたみベビーカー／抱っこ紐', '階段や石畳は抱っこ紐が機動的で、ベビーカーは搭乗口渡し可能'],
  },
  kids_wipes_safety: {
    'zh-CN': ['纯水婴儿湿巾 + 便携隔尿垫 + 安抚绘本/防丢牵引腕带', '飞机起降耳压安抚、外出清洁与人流密集景点防走失'],
    'en-US': ['Water wipes, foldable mat, flight activity book & child safety wristband', 'Keeps kids calm during takeoff/landing & safe in crowded hubs'],
    'es-MX': ['Toallitas de agua, cambiador, libro de vuelo y pulsera de seguridad', 'Calma oídos en despegue y cuida a los niños en sitios concurridos'],
    'fr-FR': ['Lingettes à l’eau, tapis à langer, cahier de vol & bracelet sécurité', 'Occupe pendant le vol et sécurise dans les lieux bondés'],
    'de-DE': ['Feuchttücher, Wickelunterlage, Malbuch & Sicherheitsarmband', 'Beschäftigt beim Flug und schützt in großen Menschenmengen'],
    'pt-BR': ['Lenços umedecidos, trocador, livrinho de voo e pulseira guia', 'Acalma na decolagem/pouso e traz segurança em locais cheios'],
    'ja-JP': ['純水おしりふき＋携帯シート＋機内用おもちゃ・迷子防止バンド', '離着陸時のグズり対策や混雑スポットでの迷子予防に'],
  },
  kids_meds: {
    'zh-CN': ['儿童专用退烧滴剂 + 便携耳温枪 + 儿童防蚊贴', '海外买儿童精准剂量药物不便，随身备齐最安心'],
    'en-US': ['Pediatric fever drops, digital thermometer & bug patches', 'Child-dosed fever medicine is critical when traveling abroad'],
    'es-MX': ['Gotas pediátricas para fiebre, termómetro y parches antimosquitos', 'Contar con dosis pediátricas exactas es vital fuera de tu país'],
    'fr-FR': ['Antipyrétique pédiatrique, thermomètre & patchs antimoustiques', 'Indispensable à l’étranger pour disposer du bon dosage enfant'],
    'de-DE': ['Kinder-Fiebersaft/-zäpfchen, Thermometer & Mückenpflaster', 'Kindgerechte Dosierungen sind im Ausland oft schwer zu bekommen'],
    'pt-BR': ['Antitérmico infantil em gotas, termômetro e adesivos repelentes', 'Dosagem pediátrica correta é fundamental em viagens internacionais'],
    'ja-JP': ['子ども用解熱剤＋体温計＋虫除けパッチ', '海外では小児用量の市販薬調達に苦労するため持参が最も安心'],
  },
  work_laptop: {
    'zh-CN': ['轻薄笔记本电脑 + 防震内胆包', '含锂电池精密设备必须随身登机，过安检方便单独取出'],
    'en-US': ['Laptop & padded protective sleeve', 'Keep laptop in carry-on for battery safety and physical protection'],
    'es-MX': ['Laptop y funda acolchada protectora', 'Llévala siempre en cabina para proteger batería y pantalla'],
    'fr-FR': ['Ordinateur portable & housse rembourrée', 'À garder en cabine pour protéger l’appareil et la batterie'],
    'de-DE': ['Laptop & gepolsterte Schutzhülle', 'Aus Akkusicherheits- und Schutzgründen immer ins Handgepäck'],
    'pt-BR': ['Notebook e capa protetora acolchoada', 'Mantenha na cabine por segurança da bateria e contra impactos'],
    'ja-JP': ['ノートPC＋耐衝撃インナーケース', '精密機器かつリチウム電池内蔵のため必ず機内持ち込みへ'],
  },
  work_gan: {
    'zh-CN': ['65W/100W 氮化镓 (GaN) 多口快充头', '一颗轻巧氮化镓替代笨重原装电源砖，同时充电脑与手机'],
    'en-US': ['65W+ GaN compact laptop & phone charger', 'Replaces bulky laptop brick and charges phone at the same time'],
    'es-MX': ['Cargador compacto GaN de 65W+ para laptop y celular', 'Reemplaza cargadores pesados y alimenta ambos equipos a la vez'],
    'fr-FR': ['Chargeur compact GaN 65W+ pour PC et téléphone', 'Remplace le gros bloc d’origine et charge plusieurs appareils'],
    'de-DE': ['Kompaktes 65W+ GaN-Netzteil für Laptop & Handy', 'Ersetzt klobige Originalnetzteile und lädt mehrere Geräte zugleich'],
    'pt-BR': ['Carregador compacto GaN 65W+ para notebook e celular', 'Substitui fontes pesadas e carrega tudo ao mesmo tempo'],
    'ja-JP': ['65W/100W GaN 小型急速充電器', '重い純正アダプター不要でPCとスマホを同時に急速充電'],
  },
  work_mouse_hub: {
    'zh-CN': ['静音蓝牙鼠标 + Type-C 多合一扩展坞 + 屏幕防窥贴', '咖啡馆、高铁与酒店书桌高效办公投屏'],
    'en-US': ['Compact wireless mouse & USB-C HDMI/SD hub', 'Ergonomic café/hotel desk work and external display hookup'],
    'es-MX': ['Mouse inalámbrico compacto y hub USB-C HDMI/SD', 'Trabajo cómodo en cafés u hoteles y conexión a pantallas'],
    'fr-FR': ['Souris sans fil compacte & hub USB-C HDMI/SD', 'Productivité en café/hôtel et branchement écran externe'],
    'de-DE': ['Kompakte Funkmaus & USB-C-HDMI/SD-Hub', 'Effizientes Arbeiten im Café oder Hotelzimmer'],
    'pt-BR': ['Mouse sem fio silencioso e hub USB-C HDMI/SD', 'Trabalho ágil em cafés, hotéis e conexão a monitores'],
    'ja-JP': ['静音ワイヤレスマウス＋USB-Cハブ（HDMI/SD対応）', 'カフェやホテルのデスクでの作業効率と外部画面出力に'],
  },
  work_stand: {
    'zh-CN': ['超轻折叠笔记本增高支架', '长时间远程办公保护颈椎'],
    'en-US': ['Ultralight foldable laptop stand', 'Prevents neck strain during multi-hour remote work sessions'],
    'es-MX': ['Soporte plegable ultraligero para laptop', 'Evita dolor de cuello en jornadas largas de trabajo remoto'],
    'fr-FR': ['Support pliable ultraléger pour ordinateur', 'Évite les douleurs cervicales lors de longues sessions de travail'],
    'de-DE': ['Ultraleichter faltbarer Laptopständer', 'Schont den Nacken bei längeren Remote-Work-Tagen'],
    'pt-BR': ['Suporte dobrável ultraleve para notebook', 'Evita dores no pescoço durante longas sessões de trabalho'],
    'ja-JP': ['超軽量折りたたみPCスタンド', '長時間のテレワークでも首・肩の疲労を軽減'],
  },
  photo_camera: {
    'zh-CN': ['微单/运动相机机身 + 主力挂机镜头（附快拆腕带）', '贵重光学器材全程随身携带防暴力分拣磕碰'],
    'en-US': ['Mirrorless / action camera body & prime/zoom lens', 'Valuable optics belong in cabin bag, never checked luggage'],
    'es-MX': ['Cámara mirrorless/acción y lente principal', 'Equipo óptico delicado debe viajar siempre en equipaje de mano'],
    'fr-FR': ['Appareil photo / caméra d’action & objectif principal', 'Optiques fragiles toujours en bagage cabine, jamais en soute'],
    'de-DE': ['Kamera / Actioncam & Hauptobjektiv', 'Empfindliche Optik gehört immer ins Handgepäck, nie in den Koffer'],
    'pt-BR': ['Câmera mirrorless/ação e lente principal', 'Equipamento óptico valioso vai sempre na cabine, nunca despachado'],
    'ja-JP': ['ミラーレス／アクションカメラ本体＋常用レンズ', '精密光学機器のため衝撃を避け必ず機内持ち込みで携行'],
  },
  photo_batteries: {
    'zh-CN': ['相机备用锂电池 ×2 + 双槽 USB-C 充电器（严禁托运）', '低温与高频拍摄掉电快；备用锂电池绝缘保护随身登机'],
    'en-US': ['Spare camera batteries ×2 & dual USB-C charger (Cabin ONLY)', 'Cold drains batteries fast; spare lithium cells MUST fly in cabin'],
    'es-MX': ['2 baterías extra de cámara y cargador USB-C (SOLO cabina)', 'El frío descarga rápido; baterías sueltas van obligatorias en cabina'],
    'fr-FR': ['2 batteries photo de rechange & chargeur USB-C (Cabine)', 'Le froid vide les accus ; les batteries de rechange vont en cabine'],
    'de-DE': ['2 Ersatz-Kameraakkus & Dual-USB-C-Ladegerät (NUR Kabine)', 'Kälte entlädt Akkus schnell; lose Akkus dürfen nicht in den Frachtraum'],
    'pt-BR': ['2 baterias extras de câmera e carregador USB-C (SÓ cabine)', 'Frio drena carga rápido; baterias extras devem ir na cabine'],
    'ja-JP': ['カメラ予備バッテリー×2＋USB-C充電器（預け入れ厳禁）', '低温時は消耗が早いため必須。予備電池は機内持ち込みのみ可'],
  },
  photo_sd: {
    'zh-CN': ['高速 SD / TF 存储卡 ×2 + 手机 Type-C 直连读卡器', '双卡冗余防丢片，晚间回酒店可直接导手机修图发圈'],
    'en-US': ['High-speed SD/microSD cards ×2 & USB-C card reader', 'Dual-card backup + instant evening transfers to phone/tablet'],
    'es-MX': ['2 tarjetas SD/microSD rápidas y lector USB-C', 'Respaldo doble y transferencia directa al celular por la noche'],
    'fr-FR': ['2 cartes SD/microSD rapides & lecteur USB-C', 'Double sauvegarde et transfert rapide sur téléphone le soir'],
    'de-DE': ['2 schnelle SD-/microSD-Karten & USB-C-Kartenleser', 'Doppelte Sicherheit und schnelle Übertragung aufs Smartphone'],
    'pt-BR': ['2 cartões SD/microSD rápidos e leitor USB-C', 'Backup duplo e transferência direta para o celular à noite'],
    'ja-JP': ['高速SD／microSDカード×2＋USB-Cカードリーダー', 'バックアップ確保と、夜ホテルでのスマホ即転送・編集に'],
  },
  photo_tripod: {
    'zh-CN': ['便携气吹 + 超细纤维镜头布 + 碳纤维迷你三脚架', '海风盐雾与雨滴水渍随时无损清洁，夜景与自拍稳固支撑'],
    'en-US': ['Mini rocket air blower, microfiber lens cloths & compact tripod', 'Clears sea spray/dust safely + supports night shots and couple portraits'],
    'es-MX': ['Soplador de aire, paño de microfibra y tripié compacto', 'Limpia polvo/brisa marina y estabiliza tomas nocturnas'],
    'fr-FR': ['Poire soufflante, chiffon microfibre & mini trépied', 'Nettoie poussière/embruns et stabilise photos de nuit'],
    'de-DE': ['Blasebalg, Mikrofaser-Linsentuch & Kompaktstativ', 'Entfernt Staub/Gischt sicher und stabilisiert Nachtaufnahmen'],
    'pt-BR': ['Bombinha de ar, flanela de microfibra e mini tripé', 'Limpa maresia/poeira com segurança e estabiliza fotos noturnas'],
    'ja-JP': ['ブロワー＋レンズクロス＋小型軽量三脚', '海風やホコリの清掃と、夜景・記念撮影のブレ防止に'],
  },
  formal_women: {
    'zh-CN': ['晚宴/婚礼礼服裙 + 精致首饰防缠绕收纳盒', '应对高档餐厅着装要求（Dress Code）体面出席'],
    'en-US': ['Occasion cocktail/wedding dress & travel jewelry case', 'Meets smart-casual / formal dress codes at fine dining and events'],
    'es-MX': ['Vestido de fiesta/cóctel y alhajero de viaje antienredos', 'Cumple con códigos de vestimenta en restaurantes finos y eventos'],
    'fr-FR': ['Robe habillée / cocktail & écrin à bijoux de voyage', 'Adapté au dress code chic pour restaurants et réceptions'],
    'de-DE': ['Abend-/Cocktailkleid & Reise-Schmuckbox', 'Erfüllt Smart-Casual- und formelle Dresscodes am Abend'],
    'pt-BR': ['Vestido social / festa e porta-joias de viagem', 'Atende ao código de vestimenta em jantares refinados e eventos'],
    'ja-JP': ['パーティー／ディナー用ドレス＋携帯ジュエリーケース', '高級レストランや式典のドレスコードにスマートに対応'],
  },
  formal_men: {
    'zh-CN': ['修身正装西服/礼服衬衫 + 领带/袖扣', '应对高档餐厅着装要求（Dress Code）体面出席'],
    'en-US': ['Tailored suit, dress shirt & tie', 'Meets smart-casual / formal dress codes at fine dining and events'],
    'es-MX': ['Traje sastre / camisa de vestir y corbata', 'Cumple con códigos de vestimenta en restaurantes finos y eventos'],
    'fr-FR': ['Costume ajusté, chemise habillée & cravate', 'Adapté au dress code chic pour restaurants et réceptions'],
    'de-DE': ['Anzug, Business-Hemd & Krawatte', 'Erfüllt Smart-Casual- und formelle Dresscodes am Abend'],
    'pt-BR': ['Terno alinhado, camisa social e gravata', 'Atende ao código de vestimenta em jantares refinados e eventos'],
    'ja-JP': ['スーツ・フォーマルシャツ＋ネクタイ／カフス', '高級レストランや式典のドレスコードにスマートに対応'],
  },
  formal_spray: {
    'zh-CN': ['便携衣物除皱喷雾 (≤100ml) + 迷你粘毛滚筒', '开箱 3 分钟抚平礼服折痕并清理浮毛，出片干净挺括'],
    'en-US': ['Travel wrinkle-release spray (≤100ml) & mini lint roller', 'Removes suitcase creases and lint in minutes before stepping out'],
    'es-MX': ['Spray antiarrugas de viaje (≤100 ml) y rodillo quitapelusa', 'Alisa dobleces de la maleta en minutos antes de salir'],
    'fr-FR': ['Spray défroissant voyage (≤100 ml) & mini brosse adhésive', 'Élimine plis de valise et peluches en quelques minutes'],
    'de-DE': ['Reise-Antiknitterspray (≤100 ml) & Mini-Fusselrolle', 'Glättet Kofferfalten und entfernt Fussel in Minuten'],
    'pt-BR': ['Spray desamassador de roupas (≤100 ml) e mini rolo tira-pelos', 'Remove marcas de mala e fiapos em minutos antes do evento'],
    'ja-JP': ['携帯シワ取りスプレー (100ml以下)＋ミニ粘着クリーナー', 'スーツケースから出した直後の折ジワやホコリをサッとケア'],
  },
  shop_duffle: {
    'zh-CN': ['可套拉杆箱超轻折叠扩容旅行包 (35L)', '去程叠成巴掌大仅 220g，伴手礼买满后直接套拉杆轻松返程'],
    'en-US': ['Packable 35L duffle bag with trolley sleeve', 'Folds tiny outbound; holds bulky tax-free shopping on the flight home'],
    'es-MX': ['Bolsa plegable de 35 L con banda para maleta', 'No ocupa espacio a la ida y carga tus compras al regreso'],
    'fr-FR': ['Sac polochon pliable 35 L avec passant valise', 'Minuscule à l’aller, idéal pour rapporter souvenirs et détaxe'],
    'de-DE': ['Faltbare 35-L-Reisetasche mit Trolley-Aufstecklasche', 'Auf dem Hinflug winzig, fasst auf dem Rückflug alle Einkäufe'],
    'pt-BR': ['Sacola dobrável 35 L com encaixe para mala', 'Vai compacta na ida e acomoda todas as compras na volta'],
    'ja-JP': ['キャリーオン対応・超軽量折りたたみボストン (35L)', '行きは手のひらサイズ、帰りは増えてお土産を楽々収納'],
  },
  shop_bubble: {
    'zh-CN': ['防震气泡袋 / 密封防漏自封袋 ×4（保护玻璃酒水护肤品）', '包裹酒水、香水或液体药妆托运防碎防漏（免税密封袋离境前勿拆）'],
    'en-US': ['Padded bubble sleeves & heavy-duty zip bags ×4', 'Protects glass bottles in checked luggage; keep sealed tax-free bags unopened'],
    'es-MX': ['4 bolsas acolchadas de burbuja y cierre hermético', 'Protege botellas y cosméticos al documentar (no abras bolsas tax-free)'],
    'fr-FR': ['4 pochettes à bulles & sacs zip étanches', 'Protège flacons et bouteilles en soute (laisser les sacs détaxe scellés)'],
    'de-DE': ['4 Luftpolsterhüllen & auslaufsichere Zip-Beutel', 'Schützt Flaschen im Koffer (versiegelte Tax-Free-Beutel nicht öffnen!)'],
    'pt-BR': ['4 sacos bolha protetores e zip-lock reforçados', 'Protege garrafas e cosméticos ao despachar (não abra lacres tax-free)'],
    'ja-JP': ['緩衝プチプチ袋＋厚手ジップ袋×4（瓶・化粧品保護）', 'お酒や化粧品の破損・液漏れ防止（免税消耗品の密封袋は出国まで開封厳禁）'],
  },
  extra_tether: {
    'zh-CN': ['防盗手机斜挎挂绳 / 手腕绳 + 便携折叠环保购物袋', '热门景点街头防抢防摔，便利店药妆店采买免买塑料袋'],
    'en-US': ['Anti-theft phone tether & foldable shopping tote', 'Prevents phone snatching in transit hubs + handy for daily shopping'],
    'es-MX': ['Correa antirrobo para celular y bolsa ecológica plegable', 'Evita caídas o robos en sitios concurridos y sirve para compras diarias'],
    'fr-FR': ['Cordon téléphone antivol & cabas pliable compact', 'Protège le téléphone en zone touristique + pratique pour les courses'],
    'de-DE': ['Diebstahlsicheres Handyband & faltbarer Einkaufsbeutel', 'Schützt vor Taschendieben/Stürzen und spart Plastiktüten'],
    'pt-BR': ['Alça antifurto para celular e sacola dobrável', 'Evita quedas ou furtos em pontos turísticos + útil nas compras'],
    'ja-JP': ['スマホ斜め掛けストラップ＋超小型エコバッグ', '観光地での落下・スリ防止と、コンビニ・お土産購入に大活躍'],
  },
  extra_scale: {
    'zh-CN': ['便携电子行李秤', '返程去机场前在酒店精准称重分配随身/托运，告别高额超重费'],
    'en-US': ['Compact digital luggage scale', 'Weigh bags at hotel before departure to avoid airline overweight fees'],
    'es-MX': ['Báscula digital portátil para equipaje', 'Pesa tus maletas en el hotel antes de ir al aeropuerto y evita cargos'],
    'fr-FR': ['Pèse-bagage numérique de poche', 'Pesez vos valises à l’hôtel pour éviter les frais d’excédent'],
    'de-DE': ['Digitale Reise-Kofferwaage', 'Wiegt Gepäck vorab im Hotel — vermeidet teure Übergepäckgebühren'],
    'pt-BR': ['Balança digital portátil para bagagem', 'Pese as malas no hotel antes do voo e evite multas por excesso'],
    'ja-JP': ['携帯デジタルラゲッジスケール（荷物計り）', '帰国前にホテルで正確に計量し、空港での超過料金を回避'],
  },
  extra_sleepkit: {
    'zh-CN': ['长途飞行遮光眼罩 + 降噪海绵耳塞 + 充气护颈枕', '红眼航班或城际长途列车高质量补觉倒时差'],
    'en-US': ['Contoured sleep mask, foam earplugs & inflatable neck pillow', 'Better rest on flights and trains without bulk'],
    'es-MX': ['Antifaz opaco, tapones para oídos y almohada inflable', 'Descansa mejor en vuelos nocturnos y trenes sin ocupar espacio'],
    'fr-FR': ['Masque occultant, bouchons d’oreilles & coussin gonflable', 'Meilleur sommeil en avion ou train sans encombrement'],
    'de-DE': ['Schlafmaske, Ohrstöpsel & aufblasbares Nackenkissen', 'Erholsamer Schlaf auf Nachtflügen und langen Zugfahrten'],
    'pt-BR': ['Máscara de dormir, protetores auriculares e almofada inflável', 'Sono melhor em voos noturnos e trens sem ocupar volume'],
    'ja-JP': ['立体遮光アイマスク＋耳栓＋携帯エアーネックピロー', '深夜便や長距離列車での質の高い仮眠と時差ボケ軽減に'],
  },
};

export function getPackingSeedItemB(
  key: PackingSeedItemKeyB,
  lang: AppLanguage
): { name: string; why: string } {
  const [name, why] = pickLang(lang, SEED_ITEMS_B[key]);
  return { name, why };
}
