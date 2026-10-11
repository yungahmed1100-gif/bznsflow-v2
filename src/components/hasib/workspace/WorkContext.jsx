import React from 'react';
import { useHasib } from '../HasibContext';
import { DealContext } from '../realestate/DealContext.jsx';
import { MediaContext } from '../media/MediaContext.jsx';
import { FitnessContext } from '../fitness/FitnessContext.jsx';
import { DentalContext } from '../dental/DentalContext.jsx';

/** The linked work beside a chat or a customer, for whichever six-tab sector the workspace runs. */
export function WorkContext(props) {
  const pack = useHasib()?.overview?.pack?.id;
  if (pack === 'media') return <MediaContext {...props} />;
  if (pack === 'fitness') return <FitnessContext {...props} />;
  if (pack === 'dental') return <DentalContext {...props} />;
  return <DealContext {...props} />;
}
