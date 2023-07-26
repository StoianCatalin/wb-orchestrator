export default function getCrawlerId(crawler_name: string) {
  switch (crawler_name) {
    case 'camera_deputatilor':
      return 'CD';
    case 'senat':
      return 'S';
    case 'mdezvoltarii':
      return 'MD';
    case 'meducatiei':
      return 'ME';
    case 'mfinante':
      return 'MF';
    case 'mmediu':
      return 'MM';
    case 'mtransport':
      return 'MT';
    case 'mae':
      return 'MAE';
    case 'mjustitie':
      return 'MJ';
    case 'mai':
      return 'MAI';
    case 'mapn':
      return 'MAPN';
    case 'camera_deputatilor_pl':
      return 'CD';
    case 'senat_pl':
      return 'S';
    case 'magriculturii':
      return 'MADR';
    case 'mcercetarii':
      return 'MCI';
    case 'mculturii':
      return 'MC';
    case 'meconomiei':
      return 'MECOM';
    case 'menergiei':
      return 'MENER';
    case 'mfamiliei':
      return 'MFAM';
    case 'minvestitiilor':
      return 'MINVEST';
    case 'mmuncii':
      return 'MMUN';
    case 'msanatatii':
      return 'MS';
    case 'msport':
      return 'MS';
    case 'mturism':
      return 'MTUR';
    default:
      return 'DOC';
  }
}
