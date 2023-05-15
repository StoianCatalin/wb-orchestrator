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
    default:
      return;
  }
}
