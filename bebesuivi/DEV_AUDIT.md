# BébéSuivi — branche de développement et audit initial

Date : 23 novembre 2026  
Branche : `bebesuivi-dev`  
Base : `main`  
Périmètre : audit statique du fichier `bebesuivi/index.html`. Aucun test navigateur, test réel Google Drive ou test médical n'a été exécuté.

## Règle de sécurité

Cette branche est isolée de `main`. La version principale n'a pas été modifiée et aucun déploiement n'a été effectué. Les évolutions doivent être réalisées et vérifiées ici avant toute proposition de fusion.

## État de l'application

- Application React 18 chargée depuis des CDN, dans un fichier HTML unique.
- Stockage local via IndexedDB (`kv` et `files`) et synchronisation Google Drive.
- Fonctions de suivi de grossesse, échographies, analyses, mesures, rendez-vous, documents, ordonnances et préparation de naissance.
- Moteur 3D WebGL procédural : la géométrie du fœtus est calculée à partir de BIP, PC, PA et LF. Ce rendu est une visualisation illustrative paramétrique, pas une reconstruction médicale fidèle de l'échographie.

## Points à traiter avant toute évolution fonctionnelle

### Priorité haute — intégrité et sauvegardes
1. **Conflits de synchronisation incomplets.** `cloudSave` détecte une modification distante, mais la fusion visible ne porte que sur les champs d'humeur du quotidien. Le reste de l'état local peut remplacer des changements distants. Concevoir une vraie stratégie de fusion/versionnement avant de faire confiance à la synchronisation multi-appareils.
2. **Échec de sauvegarde locale.** La sauvegarde IndexedDB est asynchrone et son échec est signalé par un toast ; vérifier que l'interface ne présente jamais des données non persistées comme sauvegardées.
3. **Fichiers et Drive.** Les uploads sont mis en file d'attente et réessayés ; vérifier les doublons, les suppressions, la reprise après fermeture du navigateur et la cohérence entre `driveFiles`, IndexedDB et Drive.

### Priorité haute — accès et confidentialité
1. Le flux Google utilise le scope OAuth `https://www.googleapis.com/auth/drive`, très large. Évaluer si un scope plus restreint est possible sans casser le fonctionnement.
2. Vérifier les règles de partage Drive, le contrôle d'accès côté Apps Script, le parcours propriétaire/partenaire/consultation et la révocation des accès. Un contrôle dans l'interface seule ne suffit pas à sécuriser les données.
3. Vérifier le stockage, la durée de vie et la révocation des jetons, ainsi que la gestion des erreurs d'autorisation.
4. Les données de grossesse et documents sont sensibles : limiter les journaux, exports et données envoyées à des services tiers. Les bibliothèques externes chargées par CDN et les fonctions IA doivent faire l'objet d'une revue de confidentialité.

### Priorité moyenne — calculs de grossesse
1. `ddrEff` privilégie la date de début de grossesse avec un décalage de 14 jours, sinon la DDR ; `termeDate` ajoute 287 jours à cette date de référence. Ajouter des tests de dates limites, années bissextiles, saisies incomplètes et changements de datation médicale.
2. Vérifier que les mesures échographiques sont datées et comparées à des références cohérentes, et que les valeurs manquantes ne sont pas confondues avec des valeurs nulles.
3. Les rappels d'examens et textes de santé doivent rester indicatifs et être validés par une sage-femme ou un médecin. L'application ne doit pas donner l'impression de remplacer un avis médical.

### Priorité moyenne — moteur 3D
1. Le rendu utilise WebGL et un shader de ray marching ; le contexte peut être indisponible et la compilation du shader peut échouer.
2. Ajouter des tests de compilation WebGL, de redimensionnement, de perte/restauration du contexte, de navigation tactile et de performances sur mobile.
3. Afficher clairement que la morphologie est une illustration paramétrique fondée sur des biométries, et non une image diagnostique ni une prédiction exacte de l'apparence du bébé.

## Plan de validation recommandé

- [ ] Créer une copie de sauvegarde exportable avant chaque migration de données.
- [ ] Tests unitaires des calculs SA/terme et des conversions de biométrie.
- [ ] Tests de synchronisation sur deux navigateurs : modifications simultanées, hors-ligne, reconnexion, suppression de fichier et conflits.
- [ ] Vérifier les permissions Drive avec les comptes propriétaire et partenaire, y compris révocation.
- [ ] Tests manuels WebGL sur ordinateur, iOS et Android, avec WebGL désactivé et appareil peu puissant.
- [ ] Vérifier l'accessibilité clavier, les messages d'erreur et les états de sauvegarde.
- [ ] Ne fusionner vers `main` qu'après validation et sauvegarde vérifiée.

## Décision de cet audit

Aucun changement fonctionnel n'a été apporté à `index.html`. Les points ci-dessus sont des constats de revue statique et des pistes de validation ; ils ne constituent pas des tests exécutés ni une certification de sécurité ou médicale.

## Première correction appliquée sur la branche de développement

Le mécanisme de sauvegarde Google Drive a été ajusté : lorsqu'une modification distante est détectée, l'application tente désormais de lire la version distante et d'en créer une copie JSON datée dans le dossier BébéSuivi avant d'écrire la version locale. Si la lecture ou la création de cette copie échoue, la sauvegarde est interrompue avec une erreur explicite au lieu d'écraser la version distante. L'interface signale la présence de cette copie de récupération.

**Limite importante :** ce correctif ajoute un filet de récupération, mais ne réalise pas une fusion complète des dossiers et ne supprime pas la fenêtre de concurrence entre la dernière vérification distante et l'écriture. La synchronisation doit encore être testée avec deux appareils et une stratégie de versionnement atomique reste recommandée. Aucun test réel Google Drive n'a été exécuté depuis cet environnement.

## Renforcement supplémentaire — arrêt en cas de conflit

Le comportement a été durci : si la version distante a changé depuis le dernier chargement, l'application tente maintenant de créer deux copies datées, l'une de la version distante et l'autre de la version locale. Elle interrompt ensuite la sauvegarde automatique au lieu d'écrire l'une des versions par-dessus l'autre. L'interface affiche un message explicite et ne relance pas automatiquement cette écriture conflictuelle.

Cette mesure réduit le risque d'écrasement, mais la résolution reste manuelle : il faut comparer les deux fichiers de récupération et réconcilier les données avant de reprendre le suivi. Il ne s'agit pas encore d'une fusion automatique. Si la création des copies échoue partiellement, le fichier principal n'est pas modifié par cette tentative ; une copie peut néanmoins avoir été créée.

## Validation des dates — correction appliquée

La fonction de lecture des dates vérifie maintenant que la date existe réellement dans le calendrier avant de la retourner. Les dates impossibles (par exemple 31 février, 31 avril ou mois 13) et les formats non reconnus sont rejetés au lieu d'être normalisés automatiquement par JavaScript.

Vérification locale de la fonction sur 10 cas : année bissextile valide, 29 février non bissextile, jours hors plage, mois hors plage, date valide, date ISO avec heure et formats non reconnus. Les 10 résultats attendus ont été obtenus. Ces tests ciblent la fonction de parsing ; ils ne remplacent pas une recette complète de l'application.

## Contrôle de cohérence des biométries — correction appliquée

La collecte des mesures utilisées par les courbes et la visualisation 3D filtre désormais les valeurs non numériques, nulles, négatives et hors de plages techniques larges : BIP 1–150 mm, PC/PA 1–500 mm, LF 1–120 mm et poids fœtal 1–10 000 g. Les dates/âges gestationnels associés doivent également être finis et compris entre 0 et 45 semaines décimales. Les données enregistrées dans le dossier ne sont pas modifiées : le filtre intervient uniquement au moment de la collecte pour les graphiques et le modèle 3D.

12 cas de contrôle ont été simulés sur la règle de validation (valeurs plausibles, zéro, négatif, valeurs excessives, champ inconnu et valeur non numérique) : résultats conformes aux attentes.

**Limite :** ces plages sont des garde-fous informatiques très larges, pas des intervalles médicaux de normalité, ni des critères diagnostiques. Une valeur filtrée doit rester consultable dans le document source ; l'application ne doit pas conclure à une anomalie clinique à partir de ce filtre.

## Robustesse du rendu 3D — restauration WebGL

Le composant de rendu 3D écoute maintenant les événements `webglcontextlost` et `webglcontextrestored`. À la perte du contexte, il empêche l'annulation automatique de l'événement, invalide la référence au moteur et affiche un état explicite. Lorsque le contexte revient, il recrée le moteur à partir des dernières propriétés (mesures, mode, animation et cadrage), plutôt que de réutiliser un contexte devenu invalide. Le nettoyage retire les écouteurs et détruit le moteur à la fermeture du composant.

La modification a été relue statiquement dans la branche. Aucun test WebGL réel sur navigateur ou téléphone n'a été exécuté ici ; la restauration matérielle reste à valider sur plusieurs appareils.

## Présentation fœtale dans le compte rendu et orientation 3D

Le schéma d'analyse des comptes rendus d'échographie demande maintenant explicitement la présentation (céphalique, siège avec précision si indiquée, transverse ou oblique) et interdit de la déduire à partir des images ou des biométries. Les résultats d'analyse conservent ce champ dans `biometrie.presentation`. L'analyse des séances d'images conserve également la position explicitement identifiée.

La carte 3D sélectionne le compte rendu/séance échographique le plus récent et affiche la présentation, sa source et sa date. Si la dernière échographie ne précise pas la présentation, l'application le signale et ne reprend pas silencieusement une ancienne position. Lorsque le dernier compte rendu indique explicitement un siège, la géométrie du fœtus (tête, tronc, membres, visage et cordon) est retournée pour représenter la tête vers le haut et le siège vers le bas ; l'utérus et le placenta restent fixes. Pour les présentations céphalique, transverse, oblique ou non précisées, le modèle conserve son orientation standard : l'orientation transverse/oblique n'est pas encore modélisée anatomiquement.

**Limites et validation requise :** il s'agit d'une représentation illustrative, pas d'une simulation obstétricale ni d'une interprétation médicale. La bonne orientation dépend de la formulation extraite du compte rendu ; les cas ambigus doivent être vérifiés sur le document original. Le rendu doit encore être vérifié visuellement sur navigateur et téléphone avec des exemples de comptes rendus céphaliques et en siège. Aucun document médical réel n'a été consulté ou modifié dans cette intervention.
