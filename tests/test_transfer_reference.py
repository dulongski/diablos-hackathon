"""Regression tests for transferring measured features between air environments."""
import unittest
import numpy as np
import pandas as pd
from src.stuffplus import physics

class TransferReferenceTest(unittest.TestCase):
    def setUp(self):
        self.x=pd.DataFrame({'InducedVertBreak':[16.,-8.], 'HorzBreak':[8.,-10.],
          'VertBreak':[-28.,-48.], 'movement_total':[np.hypot(16,8),np.hypot(-8,-10)],
          'spin_efficiency':[.8,.7], 'SpinRate':[2300.,2500.], 'RelSpeed':[93.,78.],
          'RelSide':[1.6,-1.5]})
        self.ref=pd.DataFrame({'ivb':[16.,-8.], 'hb':[8.,-10.]})
    def test_same_air_preserves_every_feature(self):
        pd.testing.assert_frame_equal(physics.transfer_features(self.x,self.ref,self.ref),self.x)
    def test_wrong_reference_is_rejected(self):
        with self.assertRaisesRegex(ValueError,'referencia'):
            physics.transfer_features(self.x,self.ref*1.2,self.ref)
    def test_movement_and_efficiency_share_observed_origin(self):
        dest=self.ref*.8
        got=physics.transfer_features(self.x,self.ref,dest)
        np.testing.assert_allclose(got.VertBreak,self.x.VertBreak+(dest.ivb-self.ref.ivb))
        np.testing.assert_allclose(got.spin_efficiency,self.x.spin_efficiency*.8)
        np.testing.assert_allclose(got.movement_total,self.x.movement_total*.8)
        for c in ['SpinRate','RelSpeed','RelSide']:
            np.testing.assert_array_equal(got[c],self.x[c])
    def test_row_count_mismatch_rejected(self):
        with self.assertRaisesRegex(ValueError,'filas'):
            physics.transfer_features(self.x,self.ref.iloc[:1],self.ref)

if __name__=='__main__': unittest.main()
