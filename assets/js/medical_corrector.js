/**

 * PetiCare Animal Hospital - Advanced Medical & Veterinary Terminology Corrector

 * المصحح اللغوي الطبي والصيدلاني الذكي

 * Assets / JS / medical_corrector.js

 */



(function () {

    'use strict';

    var _global = (typeof window !== 'undefined') ? window : (typeof global !== 'undefined') ? global : this;



    // Comprehensive Dictionary of Veterinary & Medical Terms

        // Common clinical phrases kept as suggestions without automatic substitution
    const SUGGESTIONS = ['تحليل دم', 'شرب ديدان', 'اقراص ديدان', 'امبول حشرات'];

const RAW_DICTIONARY = [
        {
            canonical: 'سينولوكس (Synulox)',
            words: ['سينولوكس', 'سنولوكس', 'سينالوكس', 'سينلوكس', 'سنلوكس', 'synulox']
        },
        {
            canonical: 'كونفينيا (Convenia)',
            words: ['كونفينيا', 'كونفانيا', 'كونفينيه', 'كونفنيا', 'convenia']
        },
        {
            canonical: 'سيرينيا (Cerenia - Maropitant)',
            words: ['سيرينيا', 'سرينيا', 'سيرينا', 'سيرنيا', 'ماروبيتانت', 'cerenia']
        },
        {
            canonical: 'سيمباريكا (Simparica)',
            words: ['سيمباريكا', 'سمباريكا', 'سيمباركيا', 'simparica', 'سيمباريكا تريو']
        },
        {
            canonical: 'اميزول (Imizol - Imidocarb)',
            words: ['اميزول', 'أميزول', 'ايميزول', 'إيميزول', 'اميدوكارب', 'imizol']
        },
        {
            canonical: 'لازيكس (Lasix - Furosemide)',
            words: ['لازيكس', 'لازكس', 'فيوروسيميد', 'فوروسيميد', 'lasix']
        },

        // ==========================================

        // 1. المضادات الحيوية ومضادات الميكروبات (Antibiotics)

        // ==========================================

        {

            canonical: 'أوجمنتين (Augmentin)',

            words: ['أوجمنتين', 'اوجمنتين', 'اوجمانتين', 'أوجمانتين', 'اوغمنتين', 'اوكمنتين', 'اوجمنتن', 'أوجمنتن', 'اوجمينتين', 'اوغمانتين']

        },

        {

            canonical: 'أموكسيسيلين (Amoxicillin)',

            words: ['اموكسيسيلين', 'أموكسيسيلين', 'اموكسي سيلين', 'اموكسسلين', 'اموكسيسلين', 'امكسيسيلين', 'اموكسيل', 'اموكسيدار']

        },

        {

            canonical: 'كلافيموكس (Clavamox / Clavox)',

            words: ['كلافيموكس', 'كلافي موكس', 'كلافوكس', 'كلافاموكس', 'كلاڤيموكس', 'كلافو موكس', 'ميجاموكس', 'هاي بيوتك']

        },

        {

            canonical: 'فلاجيل (Flagyl - Metronidazole)',

            words: ['فلاجيل', 'فلاجل', 'فلاجول', 'فلاجيلين', 'فلاج يل', 'امريزول', 'أمريزول', 'مترونيدازول', 'ميترونيدازول']

        },

        {

            canonical: 'سيفوتاكسيم (Cefotaxime / Cefotax)',

            words: ['سيفوتاكس', 'سيفوتاكسيم', 'سفوتاكس', 'سيفو تاكس', 'سيفوتكس', 'سيفوتاكسين', 'سيفودوكس']

        },

        {

            canonical: 'سفترياكسون (Ceftriaxone)',

            words: ['سفترياكسون', 'سيفتررياكسون', 'سيفترياكسون', 'سفترياكسن', 'سيف ترياكسون', 'سيفوترياكسون']

        },

        {

            canonical: 'سيفالكسين (Cephalexin / Keflex)',

            words: ['سيفالكسين', 'سيفالكسن', 'كيفلكس', 'سيفازولين']

        },

        {

            canonical: 'بايتريل (Baytril - Enrofloxacin)',

            words: ['بايتريل', 'بيتريل', 'بيترل', 'باي تريل', 'انروفلوكساسين', 'إنروفلوكساسين', 'انروفلوكس', 'انرو فلوكساسين']

        },

        {

            canonical: 'دوكسيسيكلين (Doxycycline)',

            words: ['دوكسيسيكلين', 'دوكسي سيكلين', 'دوكسيسايكلين', 'دوكسيكلين', 'دوكسيمايسين']

        },

        {

            canonical: 'جنتامايسين (Gentamicin)',

            words: ['جنتامايسين', 'جنتاميسين', 'جنتا مايسين', 'جنتاسين']

        },

        {

            canonical: 'أميكاسين (Amikacin)',

            words: ['اميكاسين', 'أميكاسين', 'اميكين', 'أميكين']

        },

        {

            canonical: 'لينكوميسين (Lincomycin)',

            words: ['لينكوميسين', 'لينكومايسين', 'لينكوسين']

        },

        {

            canonical: 'كليندامايسين (Clindamycin)',

            words: ['كليندامايسين', 'كلينداميسين', 'كلينداسين']

        },

        {

            canonical: 'أنتينال (Antinal)',

            words: ['انتينال', 'أنتينال', 'دايافورم', 'ستربتوكين']

        },

        {

            canonical: 'ستومورجيل (Stomorgyl - Spiramycin)',

            words: ['ستومورجيل', 'ستومورجيز', 'سبيراميسين', 'سبيرامايسين', 'رودوجيل']

        },

        {

            canonical: 'تيراميسين (Terramycin - Oxytetracycline)',

            words: ['تيراميسين', 'تيرامايسين', 'اوكسي تتراسيكلين', 'اوكسيتتراسيكلين']

        },

        {

            canonical: 'يوناسين (Unasyn / Unictam)',

            words: ['يوناسين', 'يونيكتام', 'امبيسيلين سولباكتام']

        },



        // ==========================================

        // 2. مسكنات ومضادات التهاب وخوافض حرارة (NSAIDs & Steroids)

        // ==========================================

        {

            canonical: 'ميلوكسيكام (Meloxicam / Metacam)',

            words: ['ميلوكسيكام', 'ملوكسيكام', 'ميلوكسي كام', 'ميتاكام', 'ميوكام', 'ميلوكام']

        },

        {

            canonical: 'كيتوفان (Ketofan / Ketoprofen)',

            words: ['كيتوفان', 'كتوفان', 'كيتوبروفين', 'ميبروكين']

        },

        {

            canonical: 'باراسيتامول (Paracetamol)',

            words: ['باراسيتامول', 'براسيتامول', 'باراستامول', 'بانادول', 'بنادول', 'بيرال']

        },

        {

            canonical: 'ديكساميثازون (Dexamethasone)',

            words: ['ديكساميثازون', 'ديكساميتازون', 'ديكساميثازن', 'ديكسا', 'ديكساميد', 'ديكسون']

        },

        {

            canonical: 'بريدنيزولون (Prednisolone)',

            words: ['بريدنيزولون', 'بريدنسولون', 'بريدنيسولون', 'بريدسول', 'سوليوبريد']

        },

        {

            canonical: 'بيتافوس (Betafos - Betamethasone)',

            words: ['بيتافوس', 'بيتاميثازون', 'ديبروفوس']

        },

        {

            canonical: 'تولفيدين (Tolfedine)',

            words: ['تولفيدين', 'تولفدين', 'تولفين']

        },

        {

            canonical: 'ريماديل (Rimadyl - Carprofen)',

            words: ['ريماديل', 'كاربروفين', 'كاربيدل']

        },



        // ==========================================

        // 3. مضادات الطفيليات والديدان والحشرات (Antiparasitics)

        // ==========================================

        {

            canonical: 'إيفرمكتين / إيفوماك (Ivermectin / Ivomec)',

            words: ['ايفرمكتين', 'إيفرمكتين', 'ايفر مكتين', 'افوماك', 'إيفوماك', 'ايفوميك', 'افر مكتين', 'افومك']

        },

        {

            canonical: 'ريفوليوشن (Revolution)',

            words: ['ريفوليوشن', 'ريفليوشن', 'ريفولوشن', 'رفلوشن', 'ريفيولوشن']

        },

        {

            canonical: 'فرونت لاين (Frontline)',

            words: ['فرونت لاين', 'فرونتلاين', 'فرونت لين', 'فرونتلين']

        },

        {

            canonical: 'أدفوكيت (Advocate)',

            words: ['ادفوكيت', 'أدفوكيت', 'ادفوكات', 'ادفنس']

        },

        {

            canonical: 'برافيكتو (Bravecto)',

            words: ['برافيكتو', 'برافكتو', 'برا فيكتو', 'برافكتوا']

        },

        {

            canonical: 'برودلاين (Broadline)',

            words: ['برودلاين', 'برود لاين', 'برودلين']

        },

        {

            canonical: 'سترونجهولد (Stronghold)',

            words: ['سترونجهولد', 'سترونج هولد', 'سترونغ هولد']

        },

        {

            canonical: 'درونتال (Drontal)',

            words: ['درونتال', 'درونتل', 'درونتيل', 'درون تال']

        },

        {

            canonical: 'باناسور (Panacur - Fenbendazole)',

            words: ['باناسور', 'باناكور', 'بانكور', 'فينبندازول']

        },

        {

            canonical: 'بروفيندر (Profender)',

            words: ['بروفيندر', 'بروفندر', 'بروديفندر']

        },

        {

            canonical: 'كانيكوانتيل (Caniquantel)',

            words: ['كانيكوانتيل', 'كانيكوانتل', 'كوانتيل']

        },

        {

            canonical: 'بارس نقط (Bars Drops)',

            words: ['بارس نقط', 'نقط بارس', 'امبول بارس', 'بارس']

        },



        // ==========================================

        // 4. أدوية الجهاز الهضمي والقيء والمحاليل (Gastro & Fluids)

        // ==========================================

        {

            canonical: 'زوفران / دانسيت (Zofran / Ondansetron)',

            words: ['زوفران', 'زوفرن', 'دانسيت', 'دانست', 'اوندانسيترون', 'اونداسترون']

        },

        {

            canonical: 'موتيليوم (Motilium - Domperidone)',

            words: ['موتيليوم', 'موتليم', 'دومبيريدون', 'موترون']

        },

        {

            canonical: 'كونترولوك / أوميبرازول (Controloc / Omeprazole)',

            words: ['كونترولوك', 'كنترولوك', 'كنترول لوك', 'اوميبرازول', 'أوميبرازول', 'جاستروزول', 'جاستروبرازول']

        },

        {

            canonical: 'أنتودين / فاموتيدين (Antodine / Famotidine)',

            words: ['انتودين', 'أنتودين', 'فاموتيدين', 'زنتاك', 'رانيتيدين']

        },

        {

            canonical: 'كابكت مركب (Kapect Compound)',

            words: ['كابكت', 'كابكت مركب', 'كاولين', 'بكتين']

        },

        {

            canonical: 'إبيكوجيل (Epicogel)',

            words: ['ابيكوجيل', 'ايبيكوجيل', 'ابكوجيل', 'إبيكوجيل', 'ميجالوجيل']

        },

        {

            canonical: 'ديسفلاتيل (Disflatyl - Simethicone)',

            words: ['ديسفلاتيل', 'ديفلاتيل', 'سيميثيكون']

        },

        {

            canonical: 'محلول رينجر لاكتات (Ringer Lactate)',

            words: ['رينجر لاكتات', 'محلول رينجر', 'رينجر', 'رنجر']

        },

        {

            canonical: 'محلول ملح 0.9% (Normal Saline)',

            words: ['محلول ملح', 'نورمال سلاين', 'سلاين']

        },

        {

            canonical: 'محلول جلوكوز 5% (Glucose 5%)',

            words: ['محلول جلوكوز', 'جلوكوز خمسة في المية', 'دكستروز']

        },



        // ==========================================

        // 5. المراهم والقطرات والجلدية (Topicals / Eye / Ear)

        // ==========================================

        {

            canonical: 'أوتوماكس نقط للأذن (Otomax Ear Drops)',

            words: ['اوتوماكس', 'أوتوماكس', 'اوتو ماكس', 'أوتو ماكس', 'اوتومكس']

        },

        {

            canonical: 'ديكسوريل نقط (Dexoryl)',

            words: ['ديكسوريل', 'ديكسيريل', 'دكسوريل']

        },

        {

            canonical: 'سورولان نقط (Surolan)',

            words: ['سورولان', 'سيرولان']

        },

        {

            canonical: 'فيوسيدين كريم (Fucidin Cream)',

            words: ['فيوسيدين', 'فيوسدين', 'فوسيدين', 'حمض الفيوسيديك']

        },

        {

            canonical: 'فيوسيكورت كريم (Fucicort)',

            words: ['فيوسيكورت', 'فيوسكورت', 'فوسيكورت']

        },

        {

            canonical: 'كيناكومب مركب (Kenacomb)',

            words: ['كيناكومب', 'كينا كومب', 'كيناكمب', 'بوليديرم']

        },

        {

            canonical: 'بيتادين مطهر (Betadine Antiseptic)',

            words: ['بيتادين', 'بتادين', 'بيتا دين', 'بوفيدون ايودين']

        },

        {

            canonical: 'بانثينول مرطب (Panthenol)',

            words: ['بانثينول', 'بانتينول', 'ديكسبانثينول']

        },

        {

            canonical: 'داكتارين / ميكونازول (Daktarin / Miconazole)',

            words: ['داكتارين', 'دكتارين', 'ميكونازول', 'ميكونازين']

        },

        {

            canonical: 'درماتين / كلوتريمازول (Dermatin / Clotrimazole)',

            words: ['درماتين', 'ديرماتين', 'كلوتريمازول', 'كانستين']

        },

        {

            canonical: 'لاميزيل / تيربينافين (Lamisil / Terbinafine)',

            words: ['لاميزيل', 'تيربينافين', 'تربينافين']

        },

        {

            canonical: 'توبرادكس قطرة (Tobradex Eye Drops)',

            words: ['توبرادكس', 'توبراديكس', 'توبرا دكس', 'توبرامايسين']

        },



        // ==========================================

        // 6. الفيتامينات والمكملات والأغذية (Vitamins & Food)

        // ==========================================

        {

            canonical: 'كافوزال (Catosal)',

            words: ['كافوزال', 'كاتوزال', 'كاتوسال', 'كافوسال']

        },

        {

            canonical: 'نيوروتون (Neuroton - B-Complex)',

            words: ['نيوروتون', 'نيورتون', 'نيورو تون', 'نيوروبيون', 'بيكومبلكس', 'فيتامين ب']

        },

        {

            canonical: 'كالسيوم وفيتامين د (Calci-Delice / Calcium)',

            words: ['كالسي ديليس', 'كالسيوم', 'كالسيم']

        },

        {

            canonical: 'كانفيت مكمل غذائي (Canvit)',

            words: ['كانفيت', 'كنفيت', 'كان فيت']

        },

        {

            canonical: 'أوميجا 3 (Omega 3)',

            words: ['اوميجا 3', 'أوميجا 3', 'اوميجا تلاتة', 'زيت سمك']

        },

        {

            canonical: 'دراي فود رويال كانين (Royal Canin)',

            words: ['رويال كانين', 'رويال كانن', 'ريال كانين', 'رويال']

        },



        // ==========================================

        // 7. الأمراض الفيروسية والتشخيصات (Viral & Clinical Diagnoses)

        // ==========================================

        {

            canonical: 'فيروس بارفو (Canine Parvovirus - CPV)',

            words: ['بارفو', 'بارفوا', 'برفو', 'فيروس بارفو', 'مرض بارفو', 'بارفو فيرس', 'بارفوفيروس']

        },

        {

            canonical: 'فيروس ديستمبر (Canine Distemper - CDV)',

            words: ['ديستمبر', 'دستمبر', 'دستنبر', 'فيروس ديستمبر', 'ديستمبر فيرس']

        },

        {

            canonical: 'طاعون القطط (Feline Panleukopenia - FPV)',

            words: ['بانليوكوبينيا', 'بان ليوكوبينيا', 'بانلوكو بينيا', 'بان ليكوبينيا', 'بانليكوبينيا', 'بانلوكوبينيا', 'طاعون القطط', 'بانليوكوبانيا']

        },

        {

            canonical: 'كاليسيفيروس القطط (Feline Calicivirus - FCV)',

            words: ['كاليسيفيروس', 'كاليسي', 'كاليسي فيرس', 'كاليسى', 'كليسي فيروس', 'فيروس كاليسي', 'كاليسيفيرس']

        },

        {

            canonical: 'هربس القطط (Feline Herpesvirus - FHV)',

            words: ['هربس القطط', 'هربس فيرس', 'فيروس الهربس', 'راينوتراكييتس']

        },

        {

            canonical: 'التهاب الصفاق السنوري (FIP - Feline Infectious Peritonitis)',

            words: ['اف اي بي', 'اف اى بى', 'fip', 'كورونا قطط متحور', 'التهاب البريتون المعدي', 'فيلين بيريتونايتس']

        },

        {

            canonical: 'نقص المناعة السنوري (FIV - إيدز القطط)',

            words: ['اف اي في', 'اف اى فى', 'fiv', 'ايدز القطط', 'نقص المناعة للقطط']

        },

        {

            canonical: 'داء السعار (Rabies)',

            words: ['السعار', 'داء السعار', 'ريبس', 'فيروس السعار']

        },

        {

            canonical: 'طفيليات الدم - بابيزيا (Babesiosis)',

            words: ['بابيزيا', 'بابيسيا', 'طفيليات الدم']

        },

        {

            canonical: 'طفيليات الدم - إيرليخيا (Ehrlichiosis)',

            words: ['ايرليخيا', 'إيرليخيا', 'ارليخيا']

        },

        {

            canonical: 'طفيل الجيارديا (Giardiasis)',

            words: ['جيارديا', 'طفيليات الجيارديا', 'جيارديازيس']

        },



        // ==========================================

        // 8. الأمراض الجلدية والأذن والعيون (Derm & Sensory)

        // ==========================================

        {

            canonical: 'جرب جلدي ساركوبتك (Sarcoptic Mange)',

            words: ['ساركوبتك', 'ساركوبتيك', 'جرب ساركوبتك', 'جرب جلدي', 'جرب']

        },

        {

            canonical: 'جرب ديمودكس (Demodectic Mange)',

            words: ['ديمودكس', 'ديموديكس', 'جرب ديمودكس', 'ديموديكوسيس']

        },

        {

            canonical: 'فطريات جلدية (Ringworm / Dermatophytosis)',

            words: ['رينج وورم', 'رينجوورم', 'رنج ورم', 'فطريات جلدية', 'فطريات', 'تينيا شعر']

        },

        {

            canonical: 'التهاب الأذن الخارجية (Otitis Externa)',

            words: ['اوتايتس اكستيرنا', 'اوتايتس', 'أوتايتس', 'التهاب الاذن', 'التهاب الأذن', 'التهاب بالودن']

        },

        {

            canonical: 'عثة الأذن (Ear Mites / Otodectes)',

            words: ['عثة الاذن', 'عثة الودن', 'اير مايتس', 'حشرات الودن']

        },

        {

            canonical: 'حساسية لدغات البراغيث (Flea Allergy Dermatitis - FAD)',

            words: ['اف اي دي', 'حساسية براغيث', 'حساسية حشرات', 'التهاب جلدي تحسسي']

        },

        {

            canonical: 'قرحة بالقرنية (Corneal Ulcer)',

            words: ['قرحة قرنية', 'قرحة في العين', 'التهاب ملتحمة', 'كونجنكتيفايتس']

        },



        // ==========================================

        // 9. الباطنة والمسالك والجهاز الهضمي والتنفسي (Internal & Systemic)

        // ==========================================

                {

            canonical: 'التهاب حاد في المعدة',

            words: [

                'التهاب حذف المعدة', 'التهاب حذف المعده', 'التهاب حذف في المعدة', 'التهاب حذف في المعده',

                'التهاب حذف فالمعدة', 'التهاب حذف فالمعده', 'التهاب حزف المعدة', 'التهاب حزف المعده',

                'التهاب حاد في المعدة', 'التهاب حاد في المعده', 'التهاب حاد فالمعدة', 'التهاب حاد فالمعده',

                'التهاب حاد بالمعدة', 'التهاب حاد بالمعده', 'التهاب المعدة الحاد', 'التهاب المعده الحاد',

                'التهاب المعدة', 'التهاب المعده', 'جاسترايتس حاد', 'جاسترايتس', 'اكوت جاسترايتس', 'جاستريك'

            ]

        },

{

            canonical: 'نزلة معوية حادة (Acute Gastroenteritis)',

            words: ['جاسترو انترايتس', 'جاستروانتريتس', 'جاسترو', 'نزلة معوية', 'نزله معويه', 'التهاب معوي حاد', 'التهاب المعدة والامعاء']

        },

        {

            canonical: 'قصور وظائف الكلى (Renal Insufficiency / Failure)',

            words: ['رينال فيلير', 'فشل كلوي', 'قصور كلوي', 'مشاكل في الكلى', 'ارتفاع وظائف كلى']

        },

        {

            canonical: 'قصور وظائف الكبد (Hepatic Lipidosis / Hepatitis)',

            words: ['هيباتايتس', 'دهون الكبد', 'التهاب كبدي', 'فشل كبدي', 'يرقان', 'صفراء']

        },

        {

            canonical: 'احتباس بول والتهاب مسالك بولية (FLUTD / Cystitis)',

            words: ['فلوتد', 'احتباس بول', 'التهاب المثانة', 'حصوات مجرى البول', 'مشاكل بولية', 'التهاب مسالك']

        },

        {

            canonical: 'التهاب رئوي وشعبي (Pneumonia / Bronchitis)',

            words: ['نيومونيا', 'برونكايتس', 'التهاب رئوي', 'التهاب في الصدر', 'نزلة شعبية']

        },

        {

            canonical: 'التهاب الجهاز التنفسي العلوي (Cat Flu / URI)',

            words: ['برد القطط', 'التهاب تنفسي علوي', 'انفلونزا القطط', 'يو ار اي']

        },

        {

            canonical: 'التهاب وتجمع صديدي بالرحم (Pyometra)',

            words: ['بيومترا', 'بايومترا', 'صديد في الرحم', 'التهاب صديدي بالرحم']

        },

        {

            canonical: 'خراج صديدي تحت الجلد (Abscess)',

            words: ['ابيسس', 'دمل صديدي', 'خراج تحت الجلد', 'خراج']

        },

        {

            canonical: 'جفاف بدرجة متوسطة إلى شديدة (Dehydration)',

            words: ['ديهايدريشن', 'جفاف شديد', 'جفاف حاد', 'نسبة جفاف']

        },

        {

            canonical: 'جير والتهاب حاد باللثة (Gingivitis & Dental Calculus)',

            words: ['جينجيفايتس', 'التهاب اللثة', 'جير الاسنان', 'تقرحات الفم', 'تقرحات اللسان']

        },

        {

            canonical: 'فقر دم وأنيميا حادة (Severe Anaemia)',

            words: ['انيميا حادة', 'فقر دم', 'انيميا', 'أنيميا']

        },



        // ==========================================

        // 10. الفحوصات والتحاليل والأشعة (Labs & Diagnostics)

        // ==========================================

        {

            canonical: 'صورة دم كاملة (CBC)',

            words: ['سي بي سي', 'سى بى سى', 'cbc', 'صورة دم كاملة', 'صوره دم']

        },

        {

            canonical: 'تحليل وظائف كبد وكلى (Liver & Kidney Profile)',

            words: ['وظائف كبد وكلى', 'وظايف كبد وكلى', 'كيمياء دم', 'تحليل كيميا', 'بايوكيمستري']

        },

        {

            canonical: 'تحليل بارفو سريع (Parvo Ag Snap Test)',

            words: ['رابيد تيست بارفو', 'سناب تيست بارفو', 'تحليل بارفو سريع', 'مسحة بارفو', 'تحليل بارفو']

        },

        {

            canonical: 'تحليل ديستمبر سريع (Distemper Ag Test)',

            words: ['سناب تيست ديستمبر', 'تحليل ديستمبر سريع', 'مسحة ديستمبر', 'تحليل ديستمبر']

        },

        {

            canonical: 'تحليل طفيليات الجيارديا (Giardia Ag Test)',

            words: ['سناب تيست جيارديا', 'تحليل جيارديا سريع', 'فحص جيارديا']

        },

        {

            canonical: 'أشعة تلفزيونية وسونار بطن (Abdominal Ultrasound)',

            words: ['سونار بطن', 'اشعة سونار', 'أشعة سونار', 'فحص بالسونار', 'الترا ساوند', 'التراساوند', 'سونار']

        },

        {

            canonical: 'أشعة سينية ديجيتال (Digital X-Ray)',

            words: ['اشعة اكس', 'أشعة اكس', 'اكس راي', 'اشعة سينية', 'اشعه سينيه', 'اكسراي']

        },

        {

            canonical: 'تحليل بول كامل (Complete Urinalysis)',

            words: ['تحليل بول كامل', 'فحص رواسب بول', 'تحليل بول']

        },

        {

            canonical: 'فحص براز مجهري للطفيليات (Fecal Smear Exam)',

            words: ['تحليل براز', 'فحص ميكروسكوبي للبراز', 'مسحة براز', 'فحص براز']

        },

        {

            canonical: 'كشطة جلدية لفحص الطفيليات (Skin Scraping)',

            words: ['كشطة جلدية', 'كشطة جلد', 'سكين سكرابنج', 'فحص مجهري للجلد']

        },

        {

            canonical: 'فحص مصباح وود للفطريات (Wood\'s Lamp Exam)',

            words: ['وود لامب', 'مصباح وود', 'كشف الفطريات بالضوء']

        }

    ];



        // Precompile robust regexes with Arabic boundaries, optional 'و', and negative lookahead for '('
    const COMPILED_DICTIONARY = RAW_DICTIONARY.map(entry => {
        const sortedWords = [...entry.words].sort((a, b) => b.length - a.length);
        const escaped = sortedWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        // Flexible Arabic boundary, optional waw prefix, and negative lookahead for '(' to prevent duplicate replacement
        const regex = new RegExp('(?:^|[\\s،,.:;+\\-])(و)?(' + escaped.join('|') + ')(?!\\s*\\()(?=[\\s،,.:;+\\-:]|$)', 'gi');
        return {
            canonical: entry.canonical,
            regex: regex
        };
    });

        /**
     * Correct a raw text string with clinical medical terminology,
     * normalized spoken fractions, administration routes, and lab test formats.
     */
    function correctMedicalText(rawText) {
        if (!rawText || typeof rawText !== 'string') return rawText || '';
        let text = rawText.trim();

        // 1. Spoken Dosage Fractions Normalization (Safeguard 7)
        text = text.replace(/(?:نصف|نص)\s*سم/gi, '0.5 سم');
        text = text.replace(/ربع\s*سم/gi, '0.25 سم');
        text = text.replace(/(?:ثلث|تلت)\s*سم/gi, '0.33 سم');
        text = text.replace(/سم\s*و\s*(?:نصف|نص)/gi, '1.5 سم');
        text = text.replace(/سم\s*و\s*ربع/gi, '1.25 سم');
        text = text.replace(/قرص\s*و\s*(?:نصف|نص)/gi, '1.5 قرص');
        text = text.replace(/(?:نصف|نص)\s*قرص/gi, '0.5 قرص');
        text = text.replace(/ربع\s*قرص/gi, '0.25 قرص');

        // 2. Administration Routes (Safeguard 7)
        text = text.replace(/(?:تحت\s+الجلد|تحت\s+جلد)(?!\s*\(S\.C\))/gi, 'تحت الجلد (S.C)');
        text = text.replace(/(?:^|\s)(?:حقن\s+)?عضل(?!\s*\(I\.M\))(?:\s+فقط)?(?=\s|$|[،.,])/gi, ' عضل (I.M)');
        text = text.replace(/(?:^|\s)(?:حقن\s+)?وريد(?!\s*\(I\.V\))(?:\s+فقط)?(?=\s|$|[،.,])/gi, ' وريد (I.V)');

        // 3. Lab Tests Normalization (Safeguard 7)
        text = text.replace(/(?:تحليل\s+)?صورة\s+دم\s+كاملة(?!\s*\(CBC\))/gi, 'صورة دم كاملة (CBC)');
        text = text.replace(/(?:تحليل\s+)?وظائف\s+كبد(?!\s*\(ALT\/AST\))/gi, 'وظائف كبد (ALT/AST)');
        text = text.replace(/(?:تحليل\s+)?وظائف\s+كل[ىي](?!\s*\(Creatinine\/Urea\))/gi, 'وظائف كلى (Creatinine/Urea)');
        text = text.replace(/(?:أشعة|اشعة)\s+تلفزيونية|سونار(?!\s*\(Ultrasound\))/gi, 'سونار (Ultrasound)');
        text = text.replace(/(?:أشعة|اشعة)\s+سينية|إكس\s*راي|اكس\s*راي(?!\s*\(X-Ray\))/gi, 'أشعة (X-Ray)');

        // 4. Clinical phonetic drops
        text = text.replace(/التهاب\s*(?:حذف|حزف)(?:\s*ف?ي)?\s*(?:في\s+)?(?:ف?المعد[ةه])/gi, 'التهاب حاد في المعدة');
        text = text.replace(/التهاب\s*حاد\s*(?:ف?ي)?\s*(?:في\s+)?(?:ف?المعد[ةه])/gi, 'التهاب حاد في المعدة');

        return text.trim();
    }

    function getMedicalGrammarWords() {

        return [

            'amoxicillin', 'augmentin', 'clavimox', 'ceftriaxone', 'cefotax', 'ivermectin',

            'dexamethasone', 'prednisolone', 'metronidazole', 'flagyl', 'meloxicam', 'ketofan',

            'otomax', 'revolution', 'frontline', 'drontal', 'panacur', 'bravecto', 'baytril',

            'enrofloxacin', 'zofran', 'motilium', 'paracetamol', 'panleukopenia', 'calicivirus',

            'parvovirus', 'distemper', 'rabies', 'fip', 'fiv', 'giardia', 'babesia', 'sarcoptic',

            'demodex', 'ringworm', 'otitis', 'gastroenteritis', 'ultrasound', 'xray', 'cbc'

        ];

    }



    // Expose globally

    _global.PetiCareMedicalCorrector = {
        suggestions: SUGGESTIONS,

        correct: correctMedicalText,

        dictionary: RAW_DICTIONARY,

        getGrammarWords: getMedicalGrammarWords

    };



    console.log("💉 PetiCare Medical Corrector initialized with", RAW_DICTIONARY.length, "clinical definitions.");

    // Node.js export compatibility
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = _global.PetiCareMedicalCorrector;
    }
})();
