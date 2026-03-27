"""add insurance and billing tables

Revision ID: f3c12d9e7a2b
Revises: 9a4cefe3b2c1
Create Date: 2026-03-27 10:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f3c12d9e7a2b'
down_revision = '9a4cefe3b2c1'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'insurance_policies',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('patient_id', sa.Integer(), nullable=False),
        sa.Column('provider_name', sa.String(length=255), nullable=False),
        sa.Column('policy_number', sa.String(length=120), nullable=False),
        sa.Column('plan_name', sa.String(length=255), nullable=True),
        sa.Column('coverage_percent', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('patient_id'),
    )
    with op.batch_alter_table('insurance_policies', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_insurance_policies_patient_id'), ['patient_id'], unique=False)

    op.create_table(
        'billing_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('patient_id', sa.Integer(), nullable=False),
        sa.Column('appointment_id', sa.Integer(), nullable=True),
        sa.Column('concept', sa.String(length=255), nullable=False),
        sa.Column('amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('currency', sa.String(length=10), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.Column('due_date', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('paid_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['appointment_id'], ['appointments.id']),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('billing_items', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_billing_items_appointment_id'), ['appointment_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_billing_items_patient_id'), ['patient_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_billing_items_status'), ['status'], unique=False)


def downgrade():
    with op.batch_alter_table('billing_items', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_billing_items_status'))
        batch_op.drop_index(batch_op.f('ix_billing_items_patient_id'))
        batch_op.drop_index(batch_op.f('ix_billing_items_appointment_id'))

    op.drop_table('billing_items')

    with op.batch_alter_table('insurance_policies', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_insurance_policies_patient_id'))

    op.drop_table('insurance_policies')

