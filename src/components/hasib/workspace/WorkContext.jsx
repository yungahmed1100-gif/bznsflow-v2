import React from 'react';
import { useHasib } from '../HasibContext';
import { DealContext } from '../realestate/DealContext.jsx';
import { MediaContext } from '../media/MediaContext.jsx';
import { FitnessContext } from '../fitness/FitnessContext.jsx';
import { DentalContext } from '../dental/DentalContext.jsx';
import { AutomotiveContext } from '../automotive/AutomotiveContext.jsx';
import { ConstructionContext } from '../construction/ConstructionContext.jsx';

/** The linked work beside a chat or a customer, for whichever six-tab sector the workspace runs. */
export function WorkContext(props) {
  const pack = useHasib()?.overview?.pack?.id;
  if (pack === 'media') return <MediaContext {...props} />;
  if (pack === 'fitness') return <FitnessContext {...props} />;
  if (pack === 'dental') return <DentalContext {...props} />;
  if (pack === 'automotive') return <AutomotiveContext {...props} />;
  if (pack === 'construction') return <ConstructionContext {...props} />;
  if (pack !== 'real-estate') return null;
  return <DealContext {...props} />;
}
